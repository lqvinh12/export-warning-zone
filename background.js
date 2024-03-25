chrome.webRequest.onSendHeaders.addListener(
    function (detail) {

        let requestHeaders = detail.requestHeaders;

        let authKey = "";
        let authTime = "";
        requestHeaders.forEach(element => {
            if (element.name == "authorization") {
                authKey = element.value
                
            };
            if (element.name == "authtime"){
                authTime = element.value
            };
            chrome.storage.local.set({ auth: {authKey:authKey, authTime:authTime} })
        });
    },
    { urls: ["https://api-app.daikin.com.vn:9090/portals/v1/graphql"], types: ["xmlhttprequest"] }, ["requestHeaders"]
);