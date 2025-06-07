// safepurse-backend/index.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const routes = require('./routes');

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

app.use('/api', routes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`SafePurse backend running on port ${PORT}`));

// vtpassService.js
const axios = require('axios');

const VTPASS_USERNAME = process.env.VTPASS_USERNAME;
const VTPASS_PASSWORD = process.env.VTPASS_PASSWORD;
const VTPASS_BASE_URL = 'https://sandbox.vtpass.com/api';

const payAirtime = async ({ phone, amount, serviceID = 'airtel' }) => {
  try {
    const response = await axios.post(
      `${VTPASS_BASE_URL}/pay`,
      {
        request_id: `SP-${Date.now()}`,
        serviceID,
        billersCode: phone,
        amount,
        phone,
      },
      {
        auth: {
          username: VTPASS_USERNAME,
          password: VTPASS_PASSWORD,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('VTPass Airtime Error:', error);
    throw error;
  }
};

const payElectricity = async ({ meter, amount, serviceID = 'ikeja-electric', type = 'prepaid' }) => {
  try {
    const response = await axios.post(
      `${VTPASS_BASE_URL}/pay`,
      {
        request_id: `SP-${Date.now()}`,
        serviceID,
        billersCode: meter,
        variation_code: type,
        amount,
        phone: '08000000000',
      },
      {
        auth: {
          username: VTPASS_USERNAME,
          password: VTPASS_PASSWORD,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('VTPass Electricity Error:', error);
    throw error;
  }
};

module.exports = { payAirtime, payElectricity };

// Add to routes/index.js
const { payAirtime, payElectricity } = require('../vtpassService');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Escrow = require('../models/Escrow');

// Admin: Get all users
router.get('/admin/users', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// Admin: Get all transactions
router.get('/admin/transactions', async (req, res) => {
  const transactions = await Transaction.find().sort({ createdAt: -1 });
  res.json(transactions);
});

// Admin: View escrow transactions
router.get('/admin/escrows', async (req, res) => {
  const escrows = await Escrow.find().sort({ createdAt: -1 });
  res.json(escrows);
});

// Admin: Force release escrow (e.g. dispute resolved)
router.post('/admin/escrow/release', async (req, res) => {
  const { escrowId } = req.body;
  const escrow = await Escrow.findById(escrowId);
  if (escrow && escrow.status === 'pending') {
    escrow.status = 'released';
    await escrow.save();
    await User.findByIdAndUpdate(escrow.receiverId, { $inc: { balance: escrow.amount } });
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false, message: 'Escrow not found or already handled' });
  }
});

router.post('/bills/airtime', async (req, res) => {
  const { userId, phone, amount, serviceID } = req.body;
  const user = await User.findById(userId);
  if (user.balance >= amount) {
    user.balance -= amount;
    await user.save();
    await Transaction.create({ userId, type: 'airtime', amount, status: 'success' });
    const result = await payAirtime({ phone, amount, serviceID });
    res.json({ success: true, result });
  } else {
    res.status(400).json({ success: false, message: 'Insufficient balance' });
  }
});

router.post('/bills/electricity', async (req, res) => {
  const { userId, meter, amount, serviceID, type } = req.body;
  const user = await User.findById(userId);
  if (user.balance >= amount) {
    user.balance -= amount;
    await user.save();
    await Transaction.create({ userId, type: 'electricity', amount, status: 'success' });
    const result = await payElectricity({ meter, amount, serviceID, type });
    res.json({ success: true, result });
  } else {
    res.status(400).json({ success: false, message: 'Insufficient balance' });
  }
});
