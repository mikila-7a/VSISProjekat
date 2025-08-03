    const API_TOKEN = "q0GSu3yJd74HpF6wV6tnhuWDffGjlciIE5tIrpx3SnoOXCabD2FUsLZIqCahtjWjy0PL4KSd8wxAbHKYyFPpZ8CsYD";
    const API_BASE = "https://vsis.mef.edu.rs/projekat/ulaznice/public_html/api";
    const SESSION_TOKEN = localStorage.getItem("token");

    $(document).ready(function () {
        if (!SESSION_TOKEN) {
            window.location.href = "login.html";
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('id');
        if (!userId) {
            $("#formError").text("Недостаје ID корисника.");
            return;
        }
        $("#userId").val(userId);

        loadRoles().then(() => loadUserData(userId)); 
        bindEvents();

    });

    function bindEvents() {
        $("#userRole").on("change", function () {
            const picked = $(this).val();
            if (picked === "благајник") {
                $("#locationSelectContainer").show();
                loadLocations();
            } else {
                $("#locationSelectContainer").hide();
            }
        });

        $("#saveUser").on("click", onSaveUser);
    }

    function loadUserData(userId) {
        $.ajax({
            url: `${API_BASE}/korisnik/${userId}?apitoken=${API_TOKEN}`,
            type: "GET",
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${SESSION_TOKEN}`
            },
            success: function (user) {
                $("#userName").val(user.imePrezime).data("original", user.imePrezime);
                $("#userEmail").val(user.email).data("original", user.email);
                $("#userPhone").val(user.telefon || '').data("original", user.telefon || '');
                $("#userPassword").val('');
                $("#userRole").val(user.uloga.naziv).data("original", user.uloga.naziv);
                if (user.uloga.naziv === "благајник") {
                    $("#locationSelectContainer").show();
                    loadLocations(user.lokacija?.id, user.lokacija?.id);
                } else {
                    $("#locationSelectContainer").hide();
                }
            },
            error: function (xhr) {
                console.error("Greška pri učitavanju korisnika:", xhr.status, xhr.responseText);
                $("#formError").text("Грешка при учитавању корисника. Погледајте конзолу за детаље.");
            }
        });
    }

    function loadRoles() {
        return $.ajax({
            url: `${API_BASE}/uloga?apitoken=${API_TOKEN}`,
            type: "GET",
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${SESSION_TOKEN}`
            },
            success: function (res) {
                $("#userRole").empty();
                res.forEach(role => {
                    $("#userRole").append(`<option value="${role.naziv}" data-id="${role.id}">${role.naziv}</option>`);
                });
            },
            error: function (xhr) {
                console.error("Greška pri učitavanju uloga:", xhr.status, xhr.responseText);
                $("#formError").text("Грешка при учитавању улога. Погледајте конзолу за детаље.");
            }
        });
    }

    function loadLocations(selectedId = null, originalId = null) {
        $.ajax({
            url: `${API_BASE}/lokacija?apitoken=${API_TOKEN}`,
            type: "GET",
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${SESSION_TOKEN}`
            },
            success: function (res) {
                $("#userLocation").empty();
                res.forEach(loc => {
                    $("#userLocation").append(`<option value="${loc.id}" ${loc.id === selectedId ? 'selected' : ''}>${loc.naziv}</option>`);
                });
                if (!selectedId && res.length > 0) {
                    $("#userLocation").val(res[0].id);
                }
                $("#userLocation").data("original", originalId || (res.length > 0 ? res[0].id : null));
            },
            error: function (xhr) {
                console.error("Greška pri učitavanju lokacija:", xhr.status, xhr.responseText);
                $("#formError").text("Грешка при учитавању локација. Погледајте конзолу за детаље.");
            }
        });
    }

    function onSaveUser() {
        const id = $("#userId").val();
        const name = $("#userName").val().trim();
        const email = $("#userEmail").val().trim();
        const phone = $("#userPhone").val().trim();
        const password = $("#userPassword").val().trim(); 
        const role = $("#userRole").val();
        const locationId = $("#userLocation").val() || null;

        if (!name || !email || !role) {
            $("#saveMessage").text("Име, е-мејл и улога су обавезни.")
                .addClass("error").removeClass("success");
            return;
        }
        if (phone && !/^\+[1-9][0-9]{8,13}$/.test(phone)) {
            $("#saveMessage").text("Телефон мора бити у формату +381XXXXXXXXX.")
                .addClass("error").removeClass("success");
            return;
        }

        let userRoleId = null;
        $("#userRole option").each(function () {
            if ($(this).val() === role) userRoleId = $(this).data("id");
        });
        if (!userRoleId) {
            $("#saveMessage").text("Грешка: Улога није пронађена.")
                .addClass("error").removeClass("success");
            return;
        }

        const data = {
            name: name,
            email: email,
            userRoleId: userRoleId,
            apitoken: API_TOKEN,
            phone: phone
        };
        if (password) data.password = password;
        if (role === "благајник" && locationId) data.locationId = locationId;

        $.ajax({
            url: `${API_BASE}/korisnik/${id}`,
            type: "PATCH",
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${SESSION_TOKEN}`, 
                "Content-Type": "application/json"
            },
            data: JSON.stringify(data),
            success: function (response) {
                console.log(data);
                $("#saveMessage").text("Успешно сачувани подаци.")
                    .addClass("success").removeClass("error");
            },
            error: function (xhr) {
                console.log(data);
                console.error("Greška pri snimanju korisnika:", xhr.status, xhr.responseText);
                let msg = `Непозната грешка (status: ${xhr.status})`;
                try {
                    const err = JSON.parse(xhr.responseText);
                    if (err?.message) msg = err.message;
                    if (err?.errors) {
                        const details = Object.values(err.errors).flat().join(" ");
                        msg = `${details}`;
                    }
                } catch (e) {}
                $("#saveMessage").text(msg).addClass("error").removeClass("success");
            }
        });
    }