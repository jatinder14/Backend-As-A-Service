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

module.exports = getExchangeRates;
