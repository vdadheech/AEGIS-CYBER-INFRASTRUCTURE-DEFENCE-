/**
 * api/client.js 
 * Dedicated API fetch wrapper featuring exponential backoff.
 */
export async function fetchWithRetry(url, options = {}, retries = 3, backoff = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            if (i === retries - 1) {
                console.error(`Fetch failed after ${retries} retries: ${url}`, error);
                throw error;
            }
            console.warn(`Fetch attempt ${i + 1} failed. Retrying in ${backoff}ms...`);
            await new Promise(r => setTimeout(r, backoff));
            backoff *= 2; // Exponential backoff
        }
    }
}
