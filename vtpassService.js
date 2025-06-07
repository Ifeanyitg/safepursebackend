
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
