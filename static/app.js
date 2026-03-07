const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");

let answers = {
    fuel_type: "",
    zip: "",
    limit: "",
    use_current_location: false,
    latitude: "",
    longitude: ""
};

let step = "fuel";

function addMessage(sender, message) {
    const row = document.createElement("div");
    row.classList.add("message-row");

    if (sender === "You") {
        row.classList.add("user");
    } else {
        row.classList.add("agent");
    }

    const bubble = document.createElement("div");
    bubble.classList.add("message-bubble");
    bubble.innerHTML = `<strong>${sender}:</strong> ${message}`;

    row.appendChild(bubble);
    chatBox.appendChild(row);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function normalizeText(text) {
    return text.toLowerCase().trim();
}

function detectFuel(answer) {
    const cleaned = normalizeText(answer);

    const unsupportedGasWords = ["gasoline", "gas", "petrol"];
    for (const word of unsupportedGasWords) {
        if (cleaned.includes(word)) {
            return "UNSUPPORTED_GAS";
        }
    }

    const fuelKeywords = {
        ELEC: ["electric car", "electric", "electric vehicle", 
              "ev", "e vehicle", "tesla", "charger", "charging"],
        CNG: ["cng", "compressed natural gas"],
        LPG: ["lpg", "propane"],
        LNG: ["lng", "liquefied natural gas"],
        E85: ["e85", "ethanol", "flex fuel"],
        BD: ["bd", "biodiesel"],
        HY: ["hy", "hydrogen", "h2"],
        all: ["all", "any"]
    };

    for (const code in fuelKeywords) {
        for (const phrase of fuelKeywords[code]) {
            if (cleaned.includes(phrase)) {
                return code;
            }
        }
    }

    return null;
}

function detectZip(answer) {
    const match = answer.match(/\b\d{5}\b/);
    return match ? match[0] : "";
}

function detectCurrentLocation(answer) {
    const cleaned = normalizeText(answer);
    return cleaned.includes("current location") ||
           cleaned.includes("my location") ||
           cleaned.includes("use location") ||
           cleaned.includes("near me");
}

function detectLimit(answer) {
    const match = answer.match(/\b\d+\b/);
    return match ? match[0] : "";
}

function searchStations() {
    addMessage("SK Agent", "Searching now...");

    let url = `/api/stations?fuel_type=${answers.fuel_type}&limit=${answers.limit}`;

    if (answers.use_current_location && answers.latitude && answers.longitude) {
        url += `&latitude=${encodeURIComponent(answers.latitude)}&longitude=${encodeURIComponent(answers.longitude)}`;
    } else if (answers.zip) {
        url += `&zip=${encodeURIComponent(answers.zip)}`;
    }

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (!data.stations || data.stations.length === 0) {
                addMessage("SK Agent", "No stations found.");
                return;
            }

            data.stations.forEach(station => {
                addMessage(
                    "SK Agent",
                    `${station.name} - ${station.address}, ${station.city}, ${station.state}`
                );
            });
        });
}

function handleUserAnswer(answer) {
    if (step === "fuel") {
        const fuel = detectFuel(answer);

        if (fuel === "UNSUPPORTED_GAS") {
            addMessage("SK Agent", "We do not handle gasoline. We support alternative fuel stations.");
            return;
        }

        if (!fuel) {
            addMessage("SK Agent", "What type of fuel are you looking for?");
            return;
        }

        answers.fuel_type = fuel;
        step = "location";
        addMessage("SK Agent", "To use your location, type current location. Otherwise, enter a ZIP code.");
        return;
    }

    if (step === "location") {
        if (detectCurrentLocation(answer)) {
            if (!navigator.geolocation) {
                addMessage("SK Agent", "Your browser does not support location access. Please enter a ZIP code.");
                return;
            }

            addMessage("SK Agent", "Allow location access in your browser.");

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    answers.use_current_location = true;
                    answers.latitude = position.coords.latitude;
                    answers.longitude = position.coords.longitude;
                    step = "limit";
                    addMessage("SK Agent", "How many results do you want?");
                },
                () => {
                    addMessage("SK Agent", "I could not get your location. Please enter a ZIP code.");
                }
            );
            return;
        }

        const zip = detectZip(answer);
        if (zip) {
            answers.zip = zip;
            step = "limit";
            addMessage("SK Agent", "How many results do you want?");
            return;
        }

        addMessage("SK Agent", "Please enter a ZIP code or say current location.");
        return;
    }

    if (step === "limit") {
        const limit = detectLimit(answer);

        if (!limit) {
            addMessage("SK Agent", "Please enter a number for how many results you want.");
            return;
        }

        answers.limit = limit;
        step = "done";
        searchStations();
    }
}

sendButton.addEventListener("click", () => {
    const answer = userInput.value.trim();

    if (answer === "") {
        return;
    }

    addMessage("You", answer);
    handleUserAnswer(answer);
    userInput.value = "";
});

userInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        sendButton.click();
    }
});