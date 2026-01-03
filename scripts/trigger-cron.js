const main = async () => {
    const baseUrl = process.argv[2] || process.env.APP_URL || 'http://localhost:3000';
    const secret = process.argv[3] || process.env.CRON_SECRET;

    if (!secret) {
        console.error('Error: CRON_SECRET is not set. Pass as 2nd arg or set env var.');
        process.exit(1);
    }

    const url = `${baseUrl}/api/notifications/check-and-send`;
    console.log(`Triggering notifications check at ${url}...`);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${secret}`,
                'Content-Type': 'application/json',
            },
            // Set a timeout of 10s
            signal: AbortSignal.timeout(10000)
        });

        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            data = text;
        }

        console.log('Status:', response.status);
        console.log('Response:', typeof data === 'object' ? JSON.stringify(data, null, 2) : data);

        if (!response.ok) {
            process.exit(1);
        }
    } catch (error) {
        console.error('Failed to trigger cron:', error.message);
        if (error.cause) console.error('Cause:', error.cause);
        process.exit(1);
    }
};

main();
