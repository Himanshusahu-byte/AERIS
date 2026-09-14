/* =========================================================
   SIH 26084 - CONVECTIVE-SCALE NOWCASTING
   FRONTEND JAVASCRIPT
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       CONFIGURATION
    ===================================================== */

    const API_BASE = " https://aeris-1-8wfy.onrender.com";


    /* =====================================================
       ELEMENT HELPERS
    ===================================================== */

    const $ = (selector) => document.querySelector(selector);

    const $$ = (selector) => document.querySelectorAll(selector);


    /* =====================================================
       TOAST NOTIFICATION
       IMPORTANT: Defined before any button uses it
    ===================================================== */

    function showNotification(message, type = "success") {

        const oldToast = $(".toast-notification");

        if (oldToast) {
            oldToast.remove();
        }

        const toast = document.createElement("div");

        toast.className = "toast-notification";

        const icon =
            type === "success"
                ? "✓"
                : type === "warning"
                    ? "!"
                    : "i";

        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-message">${message}</div>
        `;

        Object.assign(toast.style, {
            position: "fixed",
            right: "25px",
            bottom: "25px",
            zIndex: "99999",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px 18px",
            background: "#162238",
            border: "1px solid #263754",
            borderRadius: "10px",
            color: "#f1f5f9",
            fontSize: "13px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            transition: "0.3s ease"
        });

        document.body.appendChild(toast);

        setTimeout(() => {

            toast.style.opacity = "0";
            toast.style.transform = "translateY(10px)";

            setTimeout(() => {
                toast.remove();
            }, 300);

        }, 3000);
    }


    /* =====================================================
       USER LOGIN SYSTEM
    ===================================================== */

    const profileButton =
        $("#profileButton") || $(".profile-btn");

    const profileDropdown =
        $("#profileDropdown") || $(".profile-dropdown");

    const loginOverlay =
        $("#loginOverlay");

    const closeLogin =
        $("#closeLogin");

    const loginForm =
        $("#loginForm");

    const guestLogin =
        $("#guestLogin");

    const logoutButton =
        $("#logoutButton") || $("#logoutBtn");

    const openProfile =
        $("#openProfile");

    const profileModal =
        $("#profileModal");

    const closeProfileModal =
        $("#closeProfileModal");

    const passwordToggle =
        $("#passwordToggle");

    const loginPassword =
        $("#loginPassword");


    /* =====================================================
       CURRENT USER
    ===================================================== */

    let currentUser = null;

    try {

        currentUser =
            JSON.parse(
                localStorage.getItem("nowcastUser")
            );

    } catch (error) {

        console.warn(
            "Invalid saved user session."
        );

        localStorage.removeItem(
            "nowcastUser"
        );
    }


    /* =====================================================
       OPEN LOGIN
    ===================================================== */

    function openLoginModal() {

        if (!loginOverlay) {
            console.warn(
                "loginOverlay not found."
            );
            return;
        }

        loginOverlay.classList.add("show");
    }


    /* =====================================================
       CLOSE LOGIN
    ===================================================== */

    function closeLoginModal() {

        if (!loginOverlay) return;

        loginOverlay.classList.remove("show");
    }


    /* =====================================================
       UPDATE USER UI
    ===================================================== */

    function updateUserInterface() {

        if (!currentUser) return;

        const name =
            currentUser.name || "User";

        const email =
            currentUser.email || "";

        const initials =
            name
                .split(" ")
                .filter(Boolean)
                .map(word => word[0])
                .join("")
                .substring(0, 2)
                .toUpperCase();


        const profileInitials =
            $("#profileInitials");

        const profileName =
            $("#profileName");

        const profileEmail =
            $("#profileEmail");

        const dropdownAvatar =
            $("#dropdownAvatar");

        const modalAvatar =
            $("#modalAvatar");

        const modalProfileName =
            $("#modalProfileName");

        const modalProfileEmail =
            $("#modalProfileEmail");

        const accountType =
            $("#accountType");


        if (profileInitials)
            profileInitials.textContent =
                initials;

        if (profileName)
            profileName.textContent =
                name;

        if (profileEmail)
            profileEmail.textContent =
                email;

        if (dropdownAvatar)
            dropdownAvatar.textContent =
                initials;

        if (modalAvatar)
            modalAvatar.textContent =
                initials;

        if (modalProfileName)
            modalProfileName.textContent =
                name;

        if (modalProfileEmail)
            modalProfileEmail.textContent =
                email;

        if (accountType)
            accountType.textContent =
                currentUser.type || "User";
    }


    /* =====================================================
       PROFILE BUTTON
    ===================================================== */

    if (profileButton && profileDropdown) {

        profileButton.addEventListener(
            "click",
            (event) => {

                event.stopPropagation();

                profileDropdown.classList.toggle(
                    "show"
                );
            }
        );

        profileDropdown.addEventListener(
            "click",
            (event) => {
                event.stopPropagation();
            }
        );

        document.addEventListener(
            "click",
            () => {

                profileDropdown.classList.remove(
                    "show"
                );
            }
        );
    }


    /* =====================================================
       LOGIN FORM
    ===================================================== */

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            (event) => {

                event.preventDefault();


                const nameInput =
                    $("#loginName");

                const emailInput =
                    $("#loginEmail");

                const passwordInput =
                    $("#loginPassword");

                const rememberInput =
                    $("#rememberMe");


                const name =
                    nameInput
                        ? nameInput.value.trim()
                        : "";

                const email =
                    emailInput
                        ? emailInput.value.trim()
                        : "";

                const password =
                    passwordInput
                        ? passwordInput.value
                        : "";

                const rememberMe =
                    rememberInput
                        ? rememberInput.checked
                        : true;


                /* VALIDATION */

                if (!name) {

                    showNotification(
                        "Please enter your full name.",
                        "warning"
                    );

                    return;
                }


                if (!email) {

                    showNotification(
                        "Please enter your email.",
                        "warning"
                    );

                    return;
                }


                if (!password) {

                    showNotification(
                        "Please enter your password.",
                        "warning"
                    );

                    return;
                }


                if (password.length < 6) {

                    showNotification(
                        "Password must contain at least 6 characters.",
                        "warning"
                    );

                    return;
                }


                /* DEMO LOGIN */

                currentUser = {

                    name: name,

                    email: email,

                    type: "User"
                };


                /* SAVE SESSION */

                if (rememberMe) {

                    localStorage.setItem(
                        "nowcastUser",
                        JSON.stringify(
                            currentUser
                        )
                    );

                } else {

                    sessionStorage.setItem(
                        "nowcastUser",
                        JSON.stringify(
                            currentUser
                        )
                    );
                }


                updateUserInterface();

                closeLoginModal();


                showNotification(
                    `Welcome, ${name}!`,
                    "success"
                );

            }
        );
    }


    /* =====================================================
       GUEST LOGIN
    ===================================================== */

    if (guestLogin) {

        guestLogin.addEventListener(
            "click",
            (event) => {

                event.preventDefault();


                currentUser = {

                    name: "Guest User",

                    email: "guest@nowcast.ai",

                    type: "Guest"
                };


                localStorage.setItem(
                    "nowcastUser",
                    JSON.stringify(
                        currentUser
                    )
                );


                updateUserInterface();

                closeLoginModal();


                showNotification(
                    "Continuing as Guest.",
                    "success"
                );
            }
        );
    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                event.stopPropagation();


                /* CLEAR ALL SESSION DATA */

                localStorage.removeItem(
                    "nowcastUser"
                );

                localStorage.removeItem(
                    "user"
                );

                localStorage.removeItem(
                    "username"
                );

                localStorage.removeItem(
                    "email"
                );

                localStorage.removeItem(
                    "token"
                );

                sessionStorage.removeItem(
                    "nowcastUser"
                );

                sessionStorage.removeItem(
                    "isLoggedIn"
                );


                currentUser = null;


                /* CLOSE PROFILE */

                if (profileDropdown) {

                    profileDropdown.classList.remove(
                        "show"
                    );
                }


                if (profileModal) {

                    profileModal.classList.remove(
                        "show"
                    );
                }


                showNotification(
                    "You have been logged out.",
                    "success"
                );


                /* OPEN LOGIN AGAIN */

                setTimeout(() => {

                    openLoginModal();

                }, 400);

            }
        );
    }


    /* =====================================================
       CLOSE LOGIN BUTTON
    ===================================================== */

    if (closeLogin) {

        closeLogin.addEventListener(
            "click",
            () => {

                if (!currentUser) {

                    showNotification(
                        "Please sign in to access the dashboard.",
                        "warning"
                    );

                    return;
                }

                closeLoginModal();
            }
        );
    }


    /* =====================================================
       PASSWORD SHOW / HIDE
    ===================================================== */

    if (
        passwordToggle &&
        loginPassword
    ) {

        passwordToggle.addEventListener(
            "click",
            () => {

                if (
                    loginPassword.type ===
                    "password"
                ) {

                    loginPassword.type =
                        "text";

                    passwordToggle.innerHTML =
                        '<i class="fas fa-eye-slash"></i>';

                } else {

                    loginPassword.type =
                        "password";

                    passwordToggle.innerHTML =
                        '<i class="fas fa-eye"></i>';
                }

            }
        );
    }


    /* =====================================================
       FORGOT PASSWORD
    ===================================================== */

    const forgotPassword =
        $("#forgotPassword");

    if (forgotPassword) {

        forgotPassword.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                showNotification(
                    "Password recovery will be connected with backend authentication.",
                    "warning"
                );
            }
        );
    }


    /* =====================================================
       PROFILE MODAL
    ===================================================== */

    if (openProfile) {

        openProfile.addEventListener(
            "click",
            () => {

                if (profileDropdown) {

                    profileDropdown.classList.remove(
                        "show"
                    );
                }

                if (profileModal) {

                    profileModal.classList.add(
                        "show"
                    );
                }
            }
        );
    }


    if (closeProfileModal) {

        closeProfileModal.addEventListener(
            "click",
            () => {

                if (profileModal) {

                    profileModal.classList.remove(
                        "show"
                    );
                }
            }
        );
    }


    /* =====================================================
       INITIAL LOGIN STATE
    ===================================================== */

    if (currentUser) {

        updateUserInterface();

        console.log(
            "User session restored:",
            currentUser.name
        );

    } else {

        console.log(
            "No user session found."
        );

        setTimeout(
            openLoginModal,
            300
        );
    }


    /* =====================================================
       NAVIGATION
    ===================================================== */

    const navItems =
        $$(".nav-item");

    const pages =
        $$(".page");


    const pageTitles = {

        dashboard: {
            title:
                "Weather Intelligence Dashboard",
            subtitle:
                "Real-time severe weather monitoring and nowcasting"
        },

        map: {
            title:
                "Live Weather Map",
            subtitle:
                "Real-time spatial visualization of atmospheric hazards"
        },

        forecast: {
            title:
                "6-Hour Nowcast",
            subtitle:
                "Short-range prediction of severe weather events"
        },

        alerts: {
            title:
                "Weather Alerts",
            subtitle:
                "Active and predicted severe weather warnings"
        },

        layers: {
            title:
                "Data Layers",
            subtitle:
                "Meteorological and satellite intelligence layers"
        },

        reports: {
            title:
                "Reports & Analysis",
            subtitle:
                "Generated weather intelligence and event reports"
        },

        settings: {
            title:
                "System Settings",
            subtitle:
                "Configure monitoring and alert preferences"
        },

        about: {
            title:
                "About NowCast AI",
            subtitle:
                "AI-powered convective weather intelligence"
        }
    };


    function updatePageHeading(pageName) {

        const heading =
            $(".page-heading h1");

        const subtitle =
            $(".page-heading p");


        if (!heading || !subtitle)
            return;


        if (pageTitles[pageName]) {

            heading.textContent =
                pageTitles[pageName].title;

            subtitle.textContent =
                pageTitles[pageName].subtitle;
        }
    }


    navItems.forEach(
        item => {

            item.addEventListener(
                "click",
                () => {

                    navItems.forEach(
                        nav =>
                            nav.classList.remove(
                                "active"
                            )
                    );


                    item.classList.add(
                        "active"
                    );


                    const target =
                        item.getAttribute(
                            "data-page"
                        );


                    if (!target)
                        return;


                    pages.forEach(
                        page =>
                            page.classList.remove(
                                "active-page"
                            )
                    );


                    const targetPage =
                        document.getElementById(
                            target
                        );


                    if (targetPage) {

                        targetPage.classList.add(
                            "active-page"
                        );
                    }


                    updatePageHeading(
                        target
                    );
                }
            );
        }
    );


    /* =====================================================
       BACKEND LOCATION SEARCH
    ===================================================== */

    const searchInput =
        $(".search-box input");


    if (searchInput) {

        searchInput.addEventListener(
            "keypress",
            (event) => {

                if (
                    event.key !==
                    "Enter"
                ) {
                    return;
                }


                const location =
                    searchInput.value.trim();


                if (!location) {

                    showNotification(
                        "Please enter a location.",
                        "warning"
                    );

                    return;
                }


                searchLocation(
                    location
                );
            }
        );
    }


    /* =====================================================
       SEARCH LOCATION
    ===================================================== */

    async function searchLocation(
        location
    ) {

        console.log(
            "Searching location:",
            location
        );


        showNotification(
            `Searching weather data for ${location}...`,
            "success"
        );


        try {

            /* -----------------------------------------
               1. LOCATION SEARCH
            ----------------------------------------- */

            const locationResponse =
                await fetch(
                    `${API_BASE}/api/search-location?city=${encodeURIComponent(location)}`
                );


            if (!locationResponse.ok) {

                throw new Error(
                    "Location not found."
                );
            }


            const locationData =
                await locationResponse.json();


            console.log(
                "Location data:",
                locationData
            );


            if (
                !locationData.locations ||
                locationData.locations.length === 0
            ) {

                throw new Error(
                    "Location not found."
                );
            }


            const place =
                locationData.locations[0];


            console.log(
                "Location found:",
                place
            );


            /* -----------------------------------------
               2. GET COORDINATES
            ----------------------------------------- */

            const latitude =
                place.latitude;

            const longitude =
                place.longitude;


            /* -----------------------------------------
               3. GET NOWCAST
            ----------------------------------------- */

            const weatherResponse =
                await fetch(
                    `${API_BASE}/api/nowcast?latitude=${latitude}&longitude=${longitude}`
                );


            if (!weatherResponse.ok) {

                throw new Error(
                    "Weather data unavailable."
                );
            }


            const weatherData =
                await weatherResponse.json();


            console.log(
                "Real weather data:",
                weatherData
            );


            /* -----------------------------------------
               4. UPDATE FRONTEND
            ----------------------------------------- */

            updateWeatherDashboard(
                place,
                weatherData
            );


            showNotification(
                `Weather data loaded for ${place.name}.`,
                "success"
            );


        } catch (error) {

            console.error(
                "Weather API Error:",
                error
            );


            showNotification(
                error.message ||
                "Unable to load weather data.",
                "warning"
            );
        }
    }


    /* =====================================================
       UPDATE WEATHER DASHBOARD
    ===================================================== */

    function updateWeatherDashboard(
        place,
        data
    ) {

        console.log(
            "Updating dashboard..."
        );


        /* LOCATION */

        const locationElements =
            $$(".location-card strong");


        locationElements.forEach(
            element => {

                element.textContent =
                    `${place.name}, ${place.country || ""}`;
            }
        );


        /* CURRENT WEATHER */

        const current =
            data.current_weather;


        if (!current) {

            console.warn(
                "Current weather missing."
            );

            return;
        }


        /* TEMPERATURE */

        const temperature =
            $(".temperature h1");


        if (temperature) {

            temperature.textContent =
                `${Math.round(current.temperature)}°`;
        }


        /* HUMIDITY */

        const humidityElements =
            $$(".humidity-value");


        humidityElements.forEach(
            element => {

                element.textContent =
                    `${Math.round(current.humidity)}%`;
            }
        );


        // Humidity
const humidity = document.getElementById("humidity");

if (humidity) {
    humidity.textContent =
        `${Math.round(current.humidity)}%`;
}


// Wind
const windSpeed = document.getElementById("windSpeed");

if (windSpeed) {
    windSpeed.textContent =
        `${Math.round(current.wind_speed)} km/h`;
}


// Cloud Cover
const cloudCover = document.getElementById("cloudCover");

if (cloudCover) {
    cloudCover.textContent =
        `${Math.round(current.cloud_cover)}%`;
}

         /* WEATHER DESCRIPTION */

        const weatherStatus =
            $(".weather-main p");


        if (weatherStatus) {

            weatherStatus.textContent =
                `Live atmospheric conditions for ${place.name}, ${place.country || ""}.`;
        }

          /* CURRENT RISK */

        if (data.current_risk) {
            console.log(
                "Current risk:",
                data.current_risk
            );

            updateRiskCards(
                data.current_risk
            );
        }


        /* NOWCAST */

        if (data.nowcast) {

            console.log(
                "6-hour nowcast:",
                data.nowcast
            );

            updateNowcastUI(
                data.nowcast
            );
        }
    }

/* =====================================================
   UPDATE RISK CARDS
   REAL BACKEND DATA
===================================================== */
function updateRiskCards(currentRisk) {
    console.log("Updating risk cards:", currentRisk);

    if (!currentRisk) {
        console.warn("No current risk data received.");
        return;
    }

    function getScore(risk) {
        if (risk == null) return 0;

        if (typeof risk === "number") {
            return Number(risk);
        }

        if (typeof risk === "string") {
            const n = parseFloat(risk);
            return Number.isFinite(n) ? n : 0;
        }

        if (typeof risk === "object") {
            const n = Number(
                risk.score ??
                risk.percentage ??
                risk.percent ??
                risk.probability ??
                risk.value ??
                0
            );

            return Number.isFinite(n) ? n : 0;
        }

        return 0;
    }

    function getLevel(risk, score) {
        if (risk && typeof risk === "object" && risk.level) {
            return String(risk.level).toUpperCase();
        }

        if (score >= 70) return "HIGH";
        if (score >= 40) return "MODERATE";
        return "LOW";
    }

    function updateCard(id, cardClass, risk) {

        const score = Math.round(getScore(risk));
        const level = getLevel(risk, score);

        const valueElement =
            document.getElementById(id) ||
            document.querySelector(
                `${cardClass} h2`
            );

        if (!valueElement) {
            console.warn("Risk element not found:", id);
            return;
        }

        valueElement.textContent = `${score}%`;

        const card =
            valueElement.closest(cardClass);

        if (!card) return;

        const levelElement =
            card.querySelector("p");

        if (levelElement) {

            levelElement.textContent = level;

            levelElement.classList.remove(
                "high-risk",
                "moderate-risk",
                "low-risk"
            );

            levelElement.classList.add(
                `${level.toLowerCase()}-risk`
            );
        }
    }

    updateCard(
        "thunderstormRisk",
        ".risk-card.thunderstorm",
        currentRisk.thunderstorm
    );

    updateCard(
        "hailRisk",
        ".risk-card-hail",
        currentRisk.hail
    );

    updateCard(
        "cloudburstRisk",
        ".risk-card-cloudburst",
        currentRisk.cloudburst
    );

    console.log("Risk cards updated successfully:", {
        thunderstorm: getScore(currentRisk.thunderstorm),
        hail: getScore(currentRisk.hail),
        cloudburst: getScore(currentRisk.cloudburst)
    });
}

function updateNowcastUI(nowcast) {

    console.log("Updating Nowcast UI:", nowcast);

    if (!Array.isArray(nowcast) || nowcast.length === 0) {
        console.warn("No nowcast data available.");
        return;
    }

    /* =================================================
       1. FORECAST TABLE
    ================================================= */

    const tableBody =
        document.querySelector(".forecast-table tbody");

    if (tableBody) {

        tableBody.innerHTML = "";

        nowcast.forEach((item, index) => {

            const row =
                document.createElement("tr");

            const weather =
                item.weather || {};

            const risks =
                item.risks || {};

            const thunderstorm =
                Number(risks.thunderstorm?.score || 0);

            const hail =
                Number(risks.hail?.score || 0);

            const cloudburst =
                Number(risks.cloudburst?.score || 0);

            const temperature =
                Number(weather.temperature || 0);

            const thunderstormLevel =
                risks.thunderstorm?.level || "LOW";

            const hailLevel =
                risks.hail?.level || "LOW";

            const cloudburstLevel =
                risks.cloudburst?.level || "LOW";


            /* Overall Risk */

            let overallLevel = "LOW";

            if (
                thunderstormLevel === "HIGH" ||
                hailLevel === "HIGH" ||
                cloudburstLevel === "HIGH"
            ) {

                overallLevel = "HIGH";

            } else if (
                thunderstormLevel === "MODERATE" ||
                hailLevel === "MODERATE" ||
                cloudburstLevel === "MODERATE"
            ) {

                overallLevel = "MODERATE";
            }


            /* Time */

            const time =
                index === 0
                    ? "NOW"
                    : `+${index} Hour`;


            row.innerHTML = `
                <td>${time}</td>

                <td>
                    ${Math.round(temperature)}°C
                </td>

                <td>
                    ${Math.round(thunderstorm)}%
                </td>

                <td>
                    ${Math.round(hail)}%
                </td>

                <td>
                    ${Math.round(cloudburst)}%
                </td>

                <td>
                    <span class="risk-badge ${overallLevel.toLowerCase()}">
                        ${overallLevel}
                    </span>
                </td>
            `;

            tableBody.appendChild(row);
        });
    }


    /* =================================================
       2. DASHBOARD 6-HOUR TIMELINE
    ================================================= */

    const timelineItems =
        document.querySelectorAll(".timeline-item");


    timelineItems.forEach((item, index) => {

        if (!nowcast[index]) {
            return;
        }


        const data =
            nowcast[index];

        const weather =
            data.weather || {};

        const risks =
            data.risks || {};


        const thunderstorm =
            Number(
                risks.thunderstorm?.score || 0
            );

        const hail =
            Number(
                risks.hail?.score || 0
            );

        const cloudburst =
            Number(
                risks.cloudburst?.score || 0
            );


        /* Calculate overall risk */

        const maxRisk =
            Math.max(
                thunderstorm,
                hail,
                cloudburst
            );


        let level = "LOW";


        if (maxRisk >= 75) {

            level = "HIGH";

        } else if (maxRisk >= 45) {

            level = "MODERATE";
        }


        /* TIME */

        const timeElement =
            item.querySelector(".time");

        if (timeElement) {

            if (index === 0) {

                timeElement.textContent =
                    "NOW";

            } else {

                timeElement.textContent =
                    `+${index} HR`;
            }
        }


        /* RISK LABEL */

        const label =
            item.querySelector("strong");

        if (label) {

            label.textContent =
                level.charAt(0) +
                level.slice(1).toLowerCase();
        }


        /* RISK BAR */

        const bar =
            item.querySelector(".timeline-bar");

        if (bar) {

            bar.classList.remove(
                "high",
                "moderate",
                "low"
            );

            bar.classList.add(
                level.toLowerCase()
            );


            /* Dynamic bar height */

            if (level === "HIGH") {

                bar.style.height = "65px";

            } else if (level === "MODERATE") {

                bar.style.height = "50px";

            } else {

                bar.style.height = "35px";
            }


            /* Extra data for debugging */

            bar.setAttribute(
                "data-risk",
                level
            );

            bar.setAttribute(
                "data-score",
                maxRisk
            );
        }

    });


    console.log(
        "Nowcast UI updated successfully."
    );
}

    /* =====================================================
       FORECAST TIME FORMAT
    ===================================================== */

    function formatForecastTime(
        value,
        index
    ) {

        if (!value) {

            return index === 0
                ? "NOW"
                : `+${index} Hour`;
        }


        if (
            typeof value ===
            "string"
        ) {

            if (
                value.includes("T")
            ) {

                const date =
                    new Date(value);


                if (
                    !isNaN(
                        date.getTime()
                    )
                ) {

                    return date.toLocaleTimeString(
                        "en-IN",
                        {
                            hour: "2-digit",
                            minute: "2-digit"
                        }
                    );
                }
            }


            return index === 0
                ? "NOW"
                : value;
        }


        return index === 0
            ? "NOW"
            : `+${index} Hour`;
    }


    /* =====================================================
       RISK LEVEL
    ===================================================== */

    function calculateRiskLevel(
        thunderstorm,
        hail,
        cloudburst
    ) {

        const risk =
            (
                Number(thunderstorm) * 0.5
                +
                Number(hail) * 0.3
                +
                Number(cloudburst) * 0.2
            );


        if (risk >= 65)
            return "HIGH";


        if (risk >= 35)
            return "MODERATE";


        return "LOW";
    }


    function riskHeight(
        risk
    ) {

        if (
            risk === "HIGH"
        )
            return 40;

        if (
            risk === "MODERATE"
        )
            return 20;

        return 5;
    }

    /* =====================================================
       MAP BUTTONS
    ===================================================== */

    const mapButtons =
        $$(".map-btn");


    mapButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    mapButtons.forEach(
                        btn =>
                            btn.classList.remove(
                                "active"
                            )
                    );


                    button.classList.add(
                        "active"
                    );


                    const layer =
                        button.textContent.trim();


                    showNotification(
                        `${layer} layer activated.`,
                        "success"
                    );
                }
            );
        }
    );


    /* =====================================================
       DATA LAYER SWITCHES
    ===================================================== */

    const switches =
        $$(".switch input");


    switches.forEach(
        toggle => {

            toggle.addEventListener(
                "change",
                () => {

                    const card =
                        toggle.closest(
                            ".layer-card"
                        );


                    let layerName =
                        "Weather Layer";


                    if (card) {

                        const heading =
                            card.querySelector(
                                "h3"
                            );


                        if (heading) {

                            layerName =
                                heading.textContent.trim();
                        }
                    }


                    if (
                        toggle.checked
                    ) {

                        showNotification(
                            `${layerName} enabled.`,
                            "success"
                        );

                    } else {

                        showNotification(
                            `${layerName} disabled.`,
                            "warning"
                        );
                    }
                }
            );
        }
    );


    /* =====================================================
       ALERT BUTTONS
    ===================================================== */

    const alertButtons =
        $$(".alert-content button");


    alertButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const card =
                        button.closest(
                            ".alert-card"
                        );


                    const title =
                        card?.querySelector(
                            "h3"
                        )?.textContent.trim()
                        ||
                        "Weather Alert";


                    showNotification(
                        `${title} selected.`,
                        "success"
                    );
                }
            );
        }
    );


    /* =====================================================
       MARK ALL ALERTS READ
    ===================================================== */

    const clearAlertButton =
        $(".clear-alert-btn");


    if (clearAlertButton) {

        clearAlertButton.addEventListener(
            "click",
            () => {

                const alertCards =
                    $$(".alert-card");


                alertCards.forEach(
                    card => {

                        card.style.opacity =
                            "0.35";
                    }
                );


                showNotification(
                    "All alerts marked as read.",
                    "success"
                );
            }
        );
    }


    /* =====================================================
       REPORT BUTTONS
    ===================================================== */

    const reportButtons =
        $$(".report-card button");


    reportButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    showNotification(
                        "Report generation started...",
                        "success"
                    );


                    setTimeout(
                        () => {

                            showNotification(
                                "Demo report generated successfully.",
                                "success"
                            );

                        },
                        1200
                    );
                }
            );
        }
    );


    /* =====================================================
       GENERATE REPORT
    ===================================================== */

    const generateReportButton =
        $(".generate-report-btn");


    if (generateReportButton) {

        generateReportButton.addEventListener(
            "click",
            () => {

                showNotification(
                    "Generating weather intelligence report...",
                    "success"
                );


                setTimeout(
                    () => {

                        showNotification(
                            "Weather report ready.",
                            "success"
                        );

                    },
                    1500
                );
            }
        );
    }


    /* =====================================================
       SETTINGS
    ===================================================== */

    const selects =
        $$(".setting-row select");


    selects.forEach(
        select => {

            select.addEventListener(
                "change",
                () => {

                    showNotification(
                        "Setting updated successfully.",
                        "success"
                    );
                }
            );
        }
    );


    /* =====================================================
       NOTIFICATION BUTTON
    ===================================================== */

    const notificationButton =
        $(".icon-btn");


    if (notificationButton) {

        notificationButton.addEventListener(
            "click",
            () => {

                showNotification(
                    "No new critical alerts.",
                    "success"
                );
            }
        );
    }


    /* =====================================================
       LIVE CLOCK
    ===================================================== */

    function updateClock() {

        const clock =
            $(".live-clock");


        if (!clock)
            return;


        clock.textContent =
            new Date().toLocaleTimeString(
                "en-IN",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                }
            );
    }


    updateClock();

    setInterval(
        updateClock,
        1000
    );


    /* =====================================================
       INITIAL DASHBOARD DEMO VALUES
    ===================================================== */

    const riskElements =
        $$(".risk-info p");


    const defaultRisk = [
        "HIGH",
        "MODERATE",
        "LOW"
    ];


    riskElements.forEach(
        (element, index) => {

            element.textContent =
                defaultRisk[index] ||
                "LOW";
        }
    );


    /* =====================================================
       INITIALIZATION LOG
    ===================================================== */

    console.log(
        "======================================"
    );

    console.log(
        "NOWCAST AI DASHBOARD"
    );

    console.log(
        "SIH 26084"
    );

    console.log(
        "Frontend initialized successfully."
    );

    console.log(
        "Backend:",
        API_BASE
    );

    console.log(
        "======================================"
    );

});