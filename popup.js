const GRAPHQL_ENDPOINT = "https://api-app.daikin.com.vn:9090/portals/v1/graphql";
const myHeaders = new Headers();


const getAllDataWithPagination = async (pageSize) => {

  let allData = [];
  let page = 1;
  let hasNextPage = true;
  while (hasNextPage) {
    const data = await getDataForPage(page, pageSize);
    console.log(`data after get: ${data}`);
    if (!data) {
      return []
    }
    if (data.bookings.length < pageSize) {
      hasNextPage = false;
    }
    allData = [...allData, ...data.bookings];
    page++;
  }
  return allData;
};

const getDataForPage = async (page, pageSize) => {
  const query = "query BOOKING($limit: Int!, $offset: Int!, $filter: bookings_bool_exp) {\n  bookings(limit: $limit, offset: $offset, where: $filter, order_by: [{shippingTime: desc, updatedAt: desc}]) {\n    code\n    bookingStatus\n    createdAt\n    createdUser{\n  name\n  email\n }\n    requestStartTime\n    \n    noteLockout\n    partner {\n      name\n      daikinCode\n      station {\n        code\n      }\n    }\n    technician {\n      name\n      technicianCode\n    }\n    shippingTime\n  }\n}\n";
  const variables = {
    limit: pageSize,
    offset: (page - 1) * pageSize,
    filter: {
      _and: { isProcessingFlag: { _eq: true }, status: { _neq: "deleted" } },
      warningStatus: { _eq: "need_to_resolve" },
      status: { _neq: "deleted" },
    },
  };
  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: myHeaders,
      body: JSON.stringify({ query, variables }),
    });


    const { data } = await response.json();
    console.log(`response ${response}`);

    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    return { results: [] };
  }
};

const exportExcel = (rows) => {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Warning-Zone");
  XLSX.writeFile(workbook, "Export_Warning_Zone.xlsx", { compression: true });
};

const main = () => {
  const pageSize = 10;
  let authKey = "";
  let authTime = "";

  chrome.storage.local.get("auth").then((result) => {
    authKey = result.auth.authKey;
    authTime = result.auth.authTime;

    myHeaders.append("authority", "api-app.daikin.com.vn:9090");
    myHeaders.append("accept", "*/*");
    myHeaders.append("accept-language", "en-US,en;q=0.9");
    myHeaders.append("appversion", "1.1.0");
    myHeaders.append("authorization", authKey);
    myHeaders.append("authtime", authTime);
    myHeaders.append("content-type", "application/json");
    myHeaders.append("device", "web");
    myHeaders.append("model", "Chrome 123");
    myHeaders.append("origin", "https://scrm-app.daikin.com.vn/");
    myHeaders.append("osversion", "Win32");
    myHeaders.append("platform", "scrm");

    getAllDataWithPagination(pageSize).then((allData) => {
      console.log("All data:", allData);
      const jsonExport = allData.map((c) => {
        const transferedObject = {
          booking_code: c.code,
          booking_status: c.bookingStatus,
          partner_name: c.partner.name,
          partner_code: c.partner.daikinCode,
          stastion_code: c.partner.station.code,
          technician_code: c.technician.technicianCode,
          technician_name: c.technician.name,
          booking_createdAt: new Date(c.createdAt),
          booking_createdBy: c.createdUser?.name,
          booking_schedule_time: new Date(c.requestStartTime),
          warning_shipping_time: new Date(c.shippingTime),
          warning_note: c.noteLockout
        }
        return transferedObject;
      });
      exportExcel(jsonExport);
    });

  });
};
const btnEle = document.getElementById("exportBtn");
btnEle.addEventListener("click", main);