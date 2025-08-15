export function getRefundAmountFromFulfillment(fulfillment) {
    console.log('fulfillment2', JSON.stringify(fulfillment));

    const uniqueItemValues = {};

    fulfillment?.tags?.forEach((tag) => {
        if (tag?.code === "quote_trail") {
            tag?.list?.forEach((item) => {
                if (item?.code === "id") {
                    const itemId = item?.value;
                    const value = parseFloat(tag?.list?.find((i) => i?.code === "value")?.value);
                    
                    if (!isNaN(value) && value < 0) {
                        if (!uniqueItemValues[itemId]) {
                            uniqueItemValues[itemId] = 0;
                        }
                        uniqueItemValues[itemId] += value;
                    }
                }
            });
        }
    });

    const sumOfNegativeValues = Object.values(uniqueItemValues).reduce((sum, value) => sum + value, 0);
    console.log('sumOfNegativeValues', sumOfNegativeValues);
    
    return sumOfNegativeValues;
}