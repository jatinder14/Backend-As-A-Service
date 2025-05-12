const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');

const env = dotenv.config();
dotenvExpand.expand(env);

// console.log(process.env.DEFI_CONVERSION_URL);

const getExchangeRates = async (from, to) => {
    try {
        console.log(from, to);
        const response = await fetch(`https://open.er-api.com/v6/latest/${from}`);
        const data = await response.json();
        return data.rates[to];

        // const usd = data.rates.USD;

        // const inr = data.rates.INR;
        // const jpy = data.rates.JPY;

        // console.log(`1 AED = ${inr} INR`);
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
    }
};

// getExchangeRates("AED", "USD");

const getCryptoExchangeRates = async (from, to) => {
    try {
        // const response = await fetch(`${process.env.DEFI_CONVERSION_URL}`);

        const response = await fetch(`${process.env.DEFI_CONVERSION_URL}&target=${from}`);

        const data = await response.json();

        console.log(data)

        console.log(data.rates[to])

        return data.rates[to];

    } catch (error) {
        console.error('Error fetching exchange rates:', error);
    }
};

// getCryptoExchangeRates("AED", "BTC");

module.exports = { getExchangeRates, getCryptoExchangeRates };

