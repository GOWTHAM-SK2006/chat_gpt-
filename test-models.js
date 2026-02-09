async function listModels() {
    const apiKey = "AIzaSyA20jNGOdU5eUeD5BSjlfm-tusuwFxjXfk";

    try {
        console.log("Fetching models via v1 API...");
        const responseV1 = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
        const dataV1 = await responseV1.json();
        console.log("v1 Models:", JSON.stringify(dataV1, null, 2));

        console.log("\nFetching models via v1beta API...");
        const responseBeta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const dataBeta = await responseBeta.json();
        console.log("v1beta Models:", JSON.stringify(dataBeta, null, 2));
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
