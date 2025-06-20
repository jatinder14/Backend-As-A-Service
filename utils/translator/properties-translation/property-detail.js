import axios from "axios";

/* status */
const getStatusLabel = (value: any) => {
  switch (value) {
    case "OFF_PLAN":
      return "For Off-Plan";
    case "RENT":
      return "For Rent";
    case "SALE":
    case "SALE_OFF_PLAN":
      return "For Sale";
    default:
      return "-";
  }
};

// Returns the appropriate status label based on soldOut flag, status type, and optional custom message
const getSoldStatusLabel = (data: any) => {
  if (data?.soldOut && data?.propertyStatusMessage) {
    return data?.propertyStatusMessage;
  } else if (
    data?.soldOut &&
    (data?.status === "OFF_PLAN" || data?.status === "SALE")
  ) {
    return "Sold";
  } else if (data?.soldOut && data?.status === "RENT") {
    return "Rented";
  } else {
    return "-";
  }
};

/* To convert the obeject to create a payload */
const toConvertFloorPlanToArray = (data: any) => {
  let convertedArray: string[] = [];

  // Extract the 'translatedText' from each object and add to the convertedArray
  data?.floorPlans?.length > 0 &&
    data?.floorPlans?.forEach((item: any) => {
      if (item?.floorName) {
        convertedArray.push(item.floorName);
      }
    });

  return convertedArray?.length > 0 ? convertedArray : "-";
};

/* To reconvert it back to string array from API response strucure */
const convertResponseArrayObject = async (data: any[]) => {
  let convertedArray: string[] = [];

  // Extract the 'translatedText' from each object and add to the convertedArray
  await data.forEach((item) => {
    if (item?.translatedText) {
      convertedArray.push(item.translatedText);
    }
  });

  return convertedArray;
};

// Returns the stringified features array if it exists and has items; otherwise, returns an empty string
const getFeaturesString = (features: any) => {
  return features?.length > 0 ? JSON.stringify(features) : "-";
};

/* to convert string data into array of object */
const convertArrayObject = async (data: string[]) => {
  const response: any = await convertResponseArrayObject(data);
  return response;
};

/* to convert array od object data into translated atring array structure */
const convertToStringArray = async (data: any) => {
  const status = getStatusLabel(data?.status);
  const soldStatusLabel = getSoldStatusLabel(data);
  const features = getFeaturesString(data?.features);
  const floorPlan = toConvertFloorPlanToArray(data);
  // Extract the 'translatedText' from each object and add to the convertedArray
  const convertedArray = [
    data?.title,
    data?.address,
    data?.description ? data?.description : "-",
    data?.type ? data?.type : "-",
    data?.developer ? data?.developer : "-",
    status,
    data?.propertyLabel ? data?.propertyLabel : "-",
    soldStatusLabel,
    features,
  ];

  return convertedArray.concat(floorPlan);
};

// Helper to decode HTML entities
const decodeHtml = (htmlString: any) => {
  const txt = document.createElement("textarea");
  txt.innerHTML = htmlString;
  return txt.value;
};

// stripOuterQuotes
const stripOuterQuotes = (str: string): string => {
  return str
    .replace(/^"(.*)"$/, "$1")
    .replace(/^"(.*)"$/, "$1")
    .trim();
};

// getLanguageDelimiter
const getLanguageDelimiter = (langCode: string): string => {
  switch (langCode.toUpperCase()) {
    case "EN":
      return ",";
    case "AR":
      return "،"; // Arabic comma
    case "FR":
      return ",";
    case "IT":
      return ",";
    case "FA":
      return "،"; // Farsi comma
    case "NL":
      return ",";
    case "ZH-CN":
      return " "; // Chinese delimiter
    case "TR":
      return ",";
    case "DE":
      return ",";
    case "RO":
      return ",";
    case "UR":
      return "،"; // Urdu comma
    case "HI":
      return ",";
    default:
      return ","; // Default to comma
  }
};

const parseTranslatedArray = (input: any, language: string): string[] => {
  try {
    const decoded = decodeHtml(
      typeof input === "string" ? input : JSON.stringify(input)
    );
    const parsed = JSON.parse(decoded);

    if (Array.isArray(parsed)) {
      const firstItem = parsed[0];

      // Case 1: clean array of strings
      if (parsed.length > 1) {
        return parsed.map(stripOuterQuotes);
      }

      // Case 2: array with one long string (likely delimited)
      if (parsed.length === 1 && typeof firstItem === "string") {
        const delimiter = getLanguageDelimiter(language);
        return firstItem.split(delimiter).map(stripOuterQuotes);
      }
    }

    throw new Error("Unexpected format");
  } catch (err) {
    // Fallback: split raw input with delimiter
    const fallbackDecoded = decodeHtml(
      typeof input === "string" ? input : JSON.stringify(input)
    );
    const delimiter = getLanguageDelimiter(language);
    return fallbackDecoded.split(delimiter).map(stripOuterQuotes);
  }
};

export const translatePropertyDetails = async (
  dynamicText: any,
  globalState: any
) => {
  let updatedObject = {};
  const url: any = process.env.TRANSLATION_API_URL;
  const convertToString = await convertToStringArray(dynamicText);
  // Header Configuration
  const headers = {
    "x-goog-api-key": process.env.TRANSLATION_API_SECRET,
    "Content-Type": "application/json",
  };

  // Payload for translating HTML content
  const payload = {
    q: convertToString,
    source: "en",
    target: globalState?.selectedLanguage?.toLowerCase(),
    format: "html",
  };

  try {
    const response = await axios.post(url, payload, { headers });
    const convertedArray: any = await convertArrayObject(
      response.data.data.translations
    );
    // let features = [];
    const features = parseTranslatedArray(
      convertedArray[8],
      globalState?.selectedLanguage
    );

    /* NOTE: from 0 to 8 index keys are defined. From index 9 onwards it is floorplans*/
    const floorPlans = convertedArray?.splice(9);
    const floorPlanUpdatedArray =
      dynamicText?.floorPlans?.length > 0
        ? dynamicText?.floorPlans?.map((item: any, index: any) => {
            if (floorPlans[index] !== "-") {
              const translated = floorPlans[index];
              return (
                translated && {
                  ...item,
                  floorName: translated,
                }
              );
            } else return {};
          })
        : [];
    // to update the object
    updatedObject = {
      ...dynamicText,
      title: convertedArray[0],
      address: convertedArray[1],
      description: convertedArray[2] !== "-" ? convertedArray[2] : "",
      type: convertedArray[3],
      developer: convertedArray[4],
      status: convertedArray[5] !== "-" ? convertedArray[5] : "",
      propertyLabel: convertedArray[6] !== "-" ? convertedArray[6] : "",
      propertyStatusMessage: convertedArray[7] !== "-" ? convertedArray[7] : "",
      features: features ? features : [],
      floorPlans: floorPlanUpdatedArray,
    };
  } catch (error) {
    return false;
  }

  return updatedObject;
};
