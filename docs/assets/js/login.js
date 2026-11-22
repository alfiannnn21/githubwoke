(function () {
    var form = document.getElementById("loginForm");
    var logoutForm = document.getElementById("logoutForm");
    var unavailable = document.getElementById("loginUnavailable");
    var message = document.getElementById("loginMessage");
    var help = document.getElementById("loginHelp");
    var button = document.getElementById("loginButton");

    function showUnavailable(text) {
        unavailable.textContent = text;
        unavailable.hidden = false;
        form.hidden = true;
        logoutForm.hidden = true;
        help.hidden = true;
    }

    function showSignedIn(user) {
        unavailable.hidden = true;
        form.hidden = true;
        logoutForm.hidden = false;
        help.hidden = true;
        message.className = "alert alert-ok";
        message.textContent = "Berhasil login sebagai " + user.email + ".";
        message.hidden = false;
    }

    function showLogin() {
        unavailable.hidden = true;
        form.hidden = false;
        logoutForm.hidden = true;
        help.hidden = false;
    }

    async function readJson(response) {
        var type = response.headers.get("content-type") || "";
        if (!type.toLowerCase().includes("application/json")) return null;
        return response.json();
    }

    fetch("/api/session", { credentials: "same-origin", cache: "no-store" })
        .then(async function (response) {
            var data = await readJson(response);
            if (response.ok && data && data.authenticated && data.user) {
                showSignedIn(data.user);
                return;
            }
            if (response.status === 401 && data) {
                showLogin();
                return;
            }
            showUnavailable("Login aktif di deployment Vercel setelah API dan database MySQL dikonfigurasi. GitHub Pages hanya menyajikan situs statis.");
        })
        .catch(function () {
            showUnavailable("Login aktif di deployment Vercel setelah API dan database MySQL dikonfigurasi. GitHub Pages hanya menyajikan situs statis.");
        });

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        message.hidden = true;
        button.disabled = true;
        button.textContent = "Memeriksa...";

        try {
            var response = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                credentials: "same-origin",
                cache: "no-store",
                body: JSON.stringify({
                    email: form.elements.email.value.trim(),
                    password: form.elements.password.value
                })
            });
            var data = await readJson(response);
            if (!response.ok) {
                message.className = "alert alert-error";
                message.textContent = data && data.error ? data.error : "Login gagal. Periksa konfigurasi layanan.";
                message.hidden = false;
                return;
            }
            if (!data || !data.user) {
                message.className = "alert alert-error";
                message.textContent = "Respons login tidak valid.";
                message.hidden = false;
                return;
            }
            form.reset();
            showSignedIn(data.user);
        } catch (error) {
            message.className = "alert alert-error";
            message.textContent = "Tidak dapat menghubungi layanan login.";
            message.hidden = false;
        } finally {
            button.disabled = false;
            button.innerHTML = '<i class="bi bi-box-arrow-in-right" aria-hidden="true"></i>&nbsp; Masuk';
        }
    });

    logoutForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        try {
            var response = await fetch("/api/logout", {
                method: "POST",
                credentials: "same-origin",
                cache: "no-store"
            });
            if (!response.ok) throw new Error("Logout request failed");
            message.hidden = true;
            showLogin();
        } catch (error) {
            message.className = "alert alert-error";
            message.textContent = "Tidak dapat keluar. Coba lagi.";
            message.hidden = false;
        }
    });
})();
