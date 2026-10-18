const TOKEN = "ec3b9050-0779-4459-adb6-516194d220d1";
const SERVICE_ID = "8e63dc9d-97bc-4a94-b5b1-3ccf74b7afc5";
const ENV_ID = "35b6405f-1060-40bc-9d5a-bd7f51a4ac2a";

const query = `{
  serviceInstance(serviceId: "${SERVICE_ID}", environmentId: "${ENV_ID}") {
    domains {
      customDomains {
        domain
        status {
          verified
          certificateStatus
          dnsRecords { recordType fqdn hostlabel requiredValue currentValue status purpose zone }
          verificationDnsHost
          verificationToken
        }
      }
    }
  }
}`;

fetch("https://backboard.railway.app/graphql/v2", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query }),
})
  .then(r => r.json())
  .then(data => {
    if (data.errors) { console.log(JSON.stringify(data, null, 2)); return; }
    const si = data.data.serviceInstance;
    for (const cd of si.domains.customDomains) {
      console.log(`Domain: ${cd.domain}`);
      console.log(`Verified: ${cd.status.verified}`);
      console.log(`Certificate: ${cd.status.certificateStatus}`);
      console.log(`\nDNS Records Required:`);
      for (const d of cd.status.dnsRecords) {
        console.log(`  Type: ${d.recordType}`);
        console.log(`  FQDN: ${d.fqdn}`);
        console.log(`  Host: ${d.hostlabel}`);
        console.log(`  Required: ${d.requiredValue}`);
        console.log(`  Current: ${d.currentValue}`);
        console.log(`  Status: ${d.status}`);
        console.log(`  Purpose: ${d.purpose}`);
        console.log(`  Zone: ${d.zone}`);
        console.log('');
      }
    }
  });
