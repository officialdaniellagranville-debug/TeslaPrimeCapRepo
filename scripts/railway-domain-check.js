const TOKEN = "ec3b9050-0779-4459-adb6-516194d220d1";
const SERVICE_ID = "8e63dc9d-97bc-4a94-b5b1-3ccf74b7afc5";
const ENV_ID = "35b6405f-1060-40bc-9d5a-bd7f51a4ac2a";

// First get DNSRecords type
async function main() {
  const headers = {
    "Authorization": `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  };
  
  // Check DNSRecords type
  let res = await fetch("https://backboard.railway.app/graphql/v2", {
    method: "POST", headers,
    body: JSON.stringify({ query: '{ __type(name: "DNSRecords") { fields { name type { name kind ofType { name } } } } }' }),
  });
  let data = await res.json();
  console.log("DNSRecords type:", JSON.stringify(data.data, null, 2));
  
  // Now query with proper fields
  const query = `{
    serviceInstance(serviceId: "${SERVICE_ID}", environmentId: "${ENV_ID}") {
      domains {
        customDomains {
          domain
          status {
            verified
            certificateStatus
            certificateErrorMessage
            dnsRecords { cnameTarget aTarget }
            verificationDnsHost
            verificationToken
          }
        }
        serviceDomains { domain }
      }
    }
  }`;
  
  res = await fetch("https://backboard.railway.app/graphql/v2", {
    method: "POST", headers,
    body: JSON.stringify({ query }),
  });
  data = await res.json();
  
  if (data.errors) {
    console.log("Errors:", JSON.stringify(data.errors, null, 2));
    // Try simpler query
    const simpleQuery = `{
      serviceInstance(serviceId: "${SERVICE_ID}", environmentId: "${ENV_ID}") {
        domains {
          customDomains {
            domain
            status {
              verified
              certificateStatus
              verificationDnsHost
              verificationToken
            }
          }
          serviceDomains { domain }
        }
      }
    }`;
    res = await fetch("https://backboard.railway.app/graphql/v2", {
      method: "POST", headers,
      body: JSON.stringify({ query: simpleQuery }),
    });
    data = await res.json();
  }
  
  console.log("\nResult:", JSON.stringify(data, null, 2));
}
main();
