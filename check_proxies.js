import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

async function test() {
    console.log("Fetching proxies...");
    const proxyRes = await axios.get('https://raw.githubusercontent.com/ErcinDedeoglu/proxies/main/proxies/http.txt');
    const proxies = proxyRes.data.split('\n').map(p => p.trim()).filter(p => p).slice(0, 50); // check first 50
    
    let working = 0;
    const promises = proxies.map(async p => {
        try {
            const agent = new HttpsProxyAgent(`http://${p}`);
            await axios.get('https://new2.rogmovies.click/ts-search.php?q=the', {
                httpsAgent: agent,
                timeout: 3000
            });
            console.log(`WORKED: ${p}`);
            working++;
        } catch(e) {}
    });
    
    await Promise.all(promises);
    console.log(`Found ${working} working proxies out of 50.`);
}
test();
