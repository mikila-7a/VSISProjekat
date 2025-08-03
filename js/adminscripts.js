        const API_TOKEN = "q0GSu3yJd74HpF6wV6tnhuWDffGjlciIE5tIrpx3SnoOXCabD2FUsLZIqCahtjWjy0PL4KSd8wxAbHKYyFPpZ8CsYD";
        const API_BASE = "https://vsis.mef.edu.rs/projekat/ulaznice/public_html/api";
        const SESSION_TOKEN = localStorage.getItem("token");
        const USER_TYPE = localStorage.getItem("type");

        const days = [
        { name: "Понедељак", value: 1 },
        { name: "Уторак", value: 2 },
        { name: "Среда", value: 3 },
        { name: "Четвртак", value: 4 },
        { name: "Петак", value: 5 },
        { name: "Субота", value: 6 },
        { name: "Недеља", value: 7 }
        ];

        $(document).ready(function () {
            if (!SESSION_TOKEN || USER_TYPE !== "администратор") {
                $("#serverError").text("Нисте пријављени или немате администраторска права.");
                setTimeout(() => {
                    window.location.href = "prijava.html";
                }, 2000);
                return;
            }
            loadRoles();
            loadUsers();
            loadLocations();
        });

        // Odjava
        $("#logoutButton").click(function () {
            localStorage.removeItem("token");
            localStorage.removeItem("type");
            window.location.href = "prijava.html";
        });

        // Validacija
        function validirajImePrezime(ime) {
            const regex = /^([A-ZČĆŽŠĐ][a-zčćžšđ]{1,}(?:[- ][A-ZČĆŽŠĐ][a-zčćžšđ]+)+)$/u;
            return regex.test(ime) && ime.length >= 5 && ime.length <= 180;
        }

        function validirajEmail(email) {
            const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return regex.test(email);
        }

        function validirajTelefon(telefon) {
            const regex = /^\+[1-9][0-9]{8,13}$/;
            return telefon ? regex.test(telefon) : true;
        }

        function validirajLozinku(lozinka) {
            const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;
            return lozinka ? regex.test(lozinka) : true;
        }

        function createWorkHoursForm() {
            const container = $("#workHoursContainer");
            container.empty();

            days.forEach(day => {
                const row = $(`
                <div class="row align-items-center mb-2">
                    <input type="hidden" name="dan" value="${day.value}">
                    <div class="col-md-2 fw-bold">${day.name}</div>
                    <div class="col">
                    <input type="number" class="form-control startHour" placeholder="Сат од (0–23)" min="0" max="23">
                    </div>
                    <div class="col">
                    <input type="number" class="form-control startMinute" placeholder="Минут од (0–59)" min="0" max="59">
                    </div>
                    <div class="col">
                    <input type="number" class="form-control endHour" placeholder="Сат до (0–23)" min="0" max="23" disabled>
                    </div>
                    <div class="col">
                    <input type="number" class="form-control endMinute" placeholder="Минут до (0–59)" min="0" max="59" disabled>
                    </div>
                </div>
                `);

                // Omogući unos krajnjeg vremena samo ako je početno vreme uneseno
                row.find(".startHour, .startMinute").on("input", function () {
                const sh = row.find(".startHour").val();
                const sm = row.find(".startMinute").val();
                if (sh !== "" || sm !== "") {
                    row.find(".endHour, .endMinute").prop("disabled", false);
                } else {
                    row.find(".endHour, .endMinute").prop("disabled", true).val("");
                }
                });

                container.append(row);
            });
        }

        // Učitavanje uloga
        function loadRoles() {
            const rolesPromise = $.ajax({
                url: `${API_BASE}/uloga?apitoken=${API_TOKEN}`,
                type: "GET",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${SESSION_TOKEN}`
                }
            });

            const usersPromise = $.ajax({
                url: `${API_BASE}/korisnik?apitoken=${API_TOKEN}`,
                type: "GET",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${SESSION_TOKEN}`
                }
            });

            $.when(rolesPromise, usersPromise).done(function (rolesResponse, usersResponse) {
                const roles = rolesResponse[0];
                const users = usersResponse[0];

                // Izračunaj broj korisnika po ulozi
                const roleCount = {};
                users.forEach(user => {
                    const roleName = user.uloga.naziv;
                    roleCount[roleName] = (roleCount[roleName] || 0) + 1;
                });

                // Ispuni tabelu i select u modalu
                $("#rolesTable tbody").empty();
                $("#userRole").empty();
                roles.forEach(role => {
                    const count = roleCount[role.naziv] || 0;
                    $("#rolesTable tbody").append(`
                        <tr>
                            <td>${role.id}</td>
                            <td>${role.naziv}</td>
                            <td>${role.opis || ''}</td>
                            <td><a href="role-users.html?role=${encodeURIComponent(role.naziv)}">${count}</a></td>
                        </tr>
                    `);
                    $("#userRole").append(`<option value="${role.id}">${role.naziv}</option>`);
                });
            }).fail(function (xhr, status, error) {
                console.error("Greška pri učitavanju uloga ili korisnika:", status, error);
                $("#serverError").text("Грешка при учитавању улога или корисnika. Погледајте конзolu za детаље.");
            });
        }

        // Učitavanje korisnika
        function loadUsers() {
            $.ajax({
                url: `${API_BASE}/korisnik?apitoken=${API_TOKEN}`,
                type: "GET",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${SESSION_TOKEN}`
                },
                success: function (res) {
                    $("#adminsTable tbody, #cashiersTable tbody, #usersTable tbody, #blockedUsersTable tbody").empty();
                    res.forEach(user => {
                        const locationCell = user.uloga.naziv === "благајник" && user.lokacija?.id
                            ? `<td><a href="edit-location.html?id=${user.lokacija.id}" class="edit-location-link">${user.lokacija.naziv || ''}</a></td>`
                            : '<td></td>';

                        const row = `
                            <tr>
                                <td>${user.id}</td>
                                <td>${user.imePrezime}</td>
                                <td>${user.email}</td>
                                <td>${user.telefon || ''}</td>
                                ${locationCell}
                                <td>
                                    <button class="btn btn-sm btn-warning edit-user" data-id="${user.id}">Измени</button>
                                    <button class="btn btn-sm btn-danger delete-user" data-id="${user.id}">Обриши</button>
                                </td>
                            </tr>`;

                        if (user.uloga.naziv === "благајник") {
                            $("#cashiersTable tbody").append(row);
                        } else if (user.uloga.naziv === "администратор") {
                            $("#adminsTable tbody").append(row);
                        } else if (user.uloga.naziv === "блокирани корисник") {
                            $("#blockedUsersTable tbody").append(row);
                        } else {
                            $("#usersTable tbody").append(row);
                        }
                    });
                },
                error: function (xhr) {
                    console.error("Greška pri učitavanju korisnika:", xhr.status, xhr.responseText);
                    $("#serverError").text("Грешка при учитавању корисника. Погледаjте конзолу за детаље.");
                }
            });
        }

        function loadLocations() {
            $.ajax({
                url: `${API_BASE}/lokacija?apitoken=${API_TOKEN}`,
                type: "GET",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${SESSION_TOKEN}`
                },
                success: function (res) {
                    $("#locationsTable tbody").empty();
                    res.forEach(loc => {
                        function minutesToTime(minutes) {
                            const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
                            const mins = (minutes % 60).toString().padStart(2, '0');
                            return `${hours}:${mins}`;
                        }

                        // Radno vreme 
                        if (loc.radnoVreme && Array.isArray(loc.radnoVreme)) {
                            radnoVreme = loc.radnoVreme.map(wh => {
                                const day = days.find(d => d.value === wh.dan);
                                const dayName = day ? day.name : `Dan ${wh.dan}`; 
                                return `<b>${dayName}</b><br>${minutesToTime(wh.od)} - ${minutesToTime(wh.do)}`;
                            }).join("<br><br>");
                        } else {
                            radnoVreme = "Nema podataka";
                        }

                        // Ukupno blagajnika
                        const totalCashiers = loc.blagajnici ? loc.blagajnici.length : 0;

                        // Ukupno događaja
                        const totalEvents = loc.dogadjaji ? loc.dogadjaji.length : 0;

                        $("#locationsTable tbody").append(`
                            <tr class="bold-row">
                                <td>${loc.id}</td>
                                <td>${loc.naziv || ''}</td>
                                <td>${loc.grad || ''}</td>
                                <td>${loc.adresa || ''}</td>
                                <td>${loc.opis || ''}</td>
                                <td>${radnoVreme}</td>
                                <td>${totalCashiers}</td>
                                <td>${totalEvents}</td>
                                <td>
                                    <button class="btn btn-sm btn-warning edit-location" data-id="${loc.id}">Измени</button><br>
                                    <button class="btn btn-sm btn-danger delete-location" data-id="${loc.id}">Обриши</button>
                                </td>
                            </tr>
                        `);
                    });
                },
                error: function (xhr) {
                    console.error("Greška pri učitavanju lokacija:", xhr.status, xhr.responseText);
                    $("#serverError").text("Грешка при учитавању локација. Погледајте конзолу за детаље.");
                }
            });
        }

        // Obrada kreiranja korisnika
        $("#saveUser").click(function () {
            const id = $("#userId").val();
            const name = $("#userName").val().trim();
            const email = $("#userEmail").val().trim();
            const phone = $("#userPhone").val().trim();
            const password = $("#userPassword").val();
            const passwordConfirm = $("#userPasswordConfirm").val();
            const roleId = $("#userRole").val();
            const locationId = $("#userLocation").val();

            // Validacija
            if (!validirajImePrezime(name)) {
                $("#userFormError").text("Име и презиме није правилно написано.");
                $("#userName").addClass("invalid").removeClass("valid");
                return;
            } else {
                $("#userName").removeClass("invalid").addClass("valid");
            }
            if (!email || !validirajEmail(email)) {
                $("#userFormError").text("Нисте унели исправан имејл.");
                $("#userEmail").addClass("invalid").removeClass("valid");
                return;
            } else {
                $("#userEmail").removeClass("invalid").addClass("valid");
            }
            if (phone && !validirajTelefon(phone)) {
                $("#userFormError").text("Телефон nije исправан.");
                $("#userPhone").addClass("invalid").removeClass("valid");
                return;
            } else {
                $("#userPhone").removeClass("invalid").addClass("valid");
            }
            if (!validirajLozinku(password)) {
                $("#userFormError").text("Лозинка nije довољно јака.");
                $("#userPassword").addClass("invalid").removeClass("valid");
                return;
            } else {
                $("#userPassword").removeClass("invalid").addClass("valid");
            }
            if (password !== passwordConfirm) {
                $("#userFormError").text("Лозинке се не поклапају.");
                $("#userPasswordConfirm").addClass("invalid").removeClass("valid");
                return;
            } else {
                $("#userPasswordConfirm").removeClass("invalid").addClass("valid");
            }
            if (!roleId) {
                $("#userFormError").text("Улога је обавезна.");
                return;
            }
            if (roleId == 2 && !locationId) { 
                $("#userFormError").text("Локација је обавезна за благајника.");
                $("#userLocation").addClass("invalid").removeClass("valid");
                return;
            } else if (roleId == 2) {
                $("#userLocation").removeClass("invalid").addClass("valid");
            }

            // Priprema podataka
            const formData = new FormData();
            formData.append("name", name);
            formData.append("email", email);
            if (phone) formData.append("phone", phone);
            formData.append("password", password);
            formData.append("userRoleId", roleId);
            if (roleId == 2 && locationId) formData.append("locationId", locationId);
            formData.append("apitoken", API_TOKEN);

            const url = `${API_BASE}/korisnik`;
            const method = "POST";

            $.ajax({
                url: url,
                type: method,
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${SESSION_TOKEN}`
                },
                data: formData,
                processData: false,
                contentType: false,
                success: function (response) {
                    $("#userModal").modal("hide");
                    loadUsers();
                    $("#userFormError").text("Успешно додат корисник.").removeClass("error").addClass("success");
                    setTimeout(() => $("#userFormError").text(""), 2000);
                },
                error: function (xhr) {
                    console.error("Greška pri čuvanju korisnika:", xhr.status, xhr.responseText);
                    let msg = `Грешка (status: ${xhr.status})`;
                    try {
                        const err = JSON.parse(xhr.responseText);
                        if (err?.message) msg = err.message;
                        if (err?.errors) {
                            const details = Object.values(err.errors).flat().join(" ");
                            msg += ` — ${details}`;
                        }
                    } catch (e) {}
                    $("#userFormError").text(msg).addClass("error").removeClass("success");
                }
            });
        });

        // Učitavanje lokacija u modalu
        $("#userModal").on("show.bs.modal", function () {
            $("#userId").val("");
            $("#userName").val("").removeClass("invalid valid");
            $("#userEmail").val("").removeClass("invalid valid");
            $("#userPhone").val("").removeClass("invalid valid");
            $("#userPassword").val("").removeClass("invalid valid");
            $("#userPasswordConfirm").val("").removeClass("invalid valid");
            $("#userRole").val("").trigger("change");
            $("#userLocation").val("").removeClass("invalid valid");
            $("#locationSelectContainer").hide();
            $("#userFormError").text("");
            $("#userModalLabel").text("Додај корисника");

            // Učitaj uloge
            $.ajax({
                url: `${API_BASE}/uloga?apitoken=${API_TOKEN}`,
                type: "GET",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${SESSION_TOKEN}`
                },
                success: function (res) {
                    $("#userRole").empty().append('<option value="">Изабери улогу</option>');
                    res.forEach(role => {
                        $("#userRole").append(`<option value="${role.id}">${role.naziv}</option>`);
                    });
                },
                error: function (xhr) {
                    console.error("Greška pri učitavanju uloga:", xhr.status, xhr.responseText);
                    $("#userFormError").text("Грешка при учитавању улога. Погледајте конзолу за детаље.").addClass("error");
                }
            });

            // Učitaj lokacije unapred
            $.ajax({
                url: `${API_BASE}/lokacija?apitoken=${API_TOKEN}`,
                type: "GET",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${SESSION_TOKEN}`
                },
                success: function (res) {
                    $("#userLocation").empty().append('<option value="">Изабери локацију</option>');
                    res.forEach(loc => {
                        $("#userLocation").append(`<option value="${loc.id}">${loc.naziv}</option>`);
                    });
                },
                error: function (xhr) {
                    console.error("Greška pri učitavanju lokacija:", xhr.status, xhr.responseText);
                    $("#userFormError").text("Грешка при учитавању lokacija. Погледајте конзолу за детаље.").addClass("error");
                }
            });
        });

        // Dinamički prikaz lokacija
        $("#userRole").on("change", function () {
            const roleId = $(this).val();
            if (roleId == 2) { 
                $("#locationSelectContainer").show();
            } else {
                $("#locationSelectContainer").hide();
            }
        });

        // Validacija polja u realnom vremenu
        $("#userName").on("blur", function () {
            const name = $(this).val().trim();
            if (!validirajImePrezime(name)) {
                $(this).addClass("invalid").removeClass("valid");
                $("#nameError").text("Име и презиме nije правилно написано").show();
            } else {
                $(this).removeClass("invalid").addClass("valid");
                $("#nameError").text("").hide();
            }
        });

        $("#userEmail").on("blur", function () {
            const email = $(this).val().trim();
            if (!email || !validirajEmail(email)) {
                $(this).addClass("invalid").removeClass("valid");
                $("#emailError").text("Нисте унели исправан имејл").show();
            } else {
                $(this).removeClass("invalid").addClass("valid");
                $("#emailError").text("").hide();
            }
        });

        $("#userPhone").on("blur", function () {
            const phone = $(this).val().trim();
            if (phone && !validirajTelefon(phone)) {
                $(this).addClass("invalid").removeClass("valid");
                $("#phoneError").text("Телефон nije исправан").show();
            } else {
                $(this).removeClass("invalid").addClass("valid");
                $("#phoneError").text("").hide();
            }
        });

        $("#userPassword").on("blur", function () {
            const password = $(this).val();
            if (!validirajLozinku(password)) {
                $(this).addClass("invalid").removeClass("valid");
                $("#passwordError").text("Лозинка nije довољно јака").show();
            } else {
                $(this).removeClass("invalid").addClass("valid");
                $("#passwordError").text("").hide();
            }
        });

        $("#userPasswordConfirm").on("blur", function () {
            const password = $("#userPassword").val();
            const confirmPassword = $(this).val();
            if (password !== confirmPassword) {
                $(this).addClass("invalid").removeClass("valid");
                $("#passwordConfirmError").text("Лозинке se ne поклапају").show();
            } else {
                $(this).removeClass("invalid").addClass("valid");
                $("#passwordConfirmError").text("").hide();
            }
        });

        $(document).on("click", ".edit-user", function () {
            const id = $(this).data("id");
            window.location.href = `edit-user.html?id=${id}`; 
        });

        $(document).on("click", ".delete-user", function () {
            if (!confirm("Да ли сте сигурни да желите да обришете корисника?")) return;
            const id = $(this).data("id");
            $.ajax({
                url: `${API_BASE}/korisnik/${id}?apitoken=${API_TOKEN}`,
                type: "DELETE",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${SESSION_TOKEN}`
                },
                success: function () {
                    loadUsers();
                },
                error: function (xhr) {
                    console.error("Greška pri brisanju korisnika:", xhr.status, xhr.responseText);
                    $("#serverError").text("Грешка при брисању корисника. Погледајте конзolu za детаље.");
                }
            });
        });

        // Obrada lokacija
        $("#saveLocation").click(function () {
            const naziv = $("#locationName").val().trim();
            const adresa = $("#locationAddress").val().trim();
            const grad = $("#locationCity").val().trim();
            const opis = $("#locationDescription").val().trim();

            if (!naziv || !adresa || !grad) {
                $("#locationFormError").text("Назив, адреса и град су обавезна поља.");
                return;
            }

            const workTimes = [];
            $("#workHoursContainer .row").each(function () {
                const dan = $(this).find('input[name="dan"]').val();
                const sh = $(this).find(".startHour").val();
                const sm = $(this).find(".startMinute").val();
                const eh = $(this).find(".endHour").val();
                const em = $(this).find(".endMinute").val();

                if (sh !== "" && sm !== "" && eh !== "" && em !== "") {
                const od = parseInt(sh) * 60 + parseInt(sm);
                const doV = parseInt(eh) * 60 + parseInt(em);
                if (od < doV) {
                    workTimes.push({ dan: parseInt(dan), od, do: doV });
                }
                }
            });

            const data = {
                name:naziv,
                address:adresa,
                city:grad,
                description:opis,
                workingHours: JSON.stringify(workTimes),
                apitoken: API_TOKEN
            };

            $.ajax({
                url: `${API_BASE}/lokacija`,
                type: "POST",
                headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${SESSION_TOKEN}`,
                "Content-Type": "application/json"
                },
                data: JSON.stringify(data),
                success: function () {
                $("#locationModal").modal("hide");
                loadLocations();
                },
                error: function (xhr) {
                console.error("Грешка при чувању локације:", xhr.status, xhr.responseText);
                try {
                    const err = JSON.parse(xhr.responseText);
                    $("#locationFormError").text(err.error || "Грешка приликом слања.");
                } catch {
                    $("#locationFormError").text("Непозната грешка.");
                }
                }
            });
        });

        $(document).on("click", ".edit-location", function () {
            const id = $(this).data("id");
            window.location.href = `edit-location.html?id=${id}`; 
        });

        $(document).on("click", ".delete-location", function () {
            if (!confirm("Да ли сте сигурни да желите да обришете локацију?")) return;
            const id = $(this).data("id");
            $.ajax({
                url: `${API_BASE}/lokacija/${id}?apitoken=${API_TOKEN}`,
                type: "DELETE",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${SESSION_TOKEN}`
                },
                success: function () {
                    loadLocations();
                },
                error: function (xhr) {
                    console.error("Greška pri brisanju lokacije:", xhr.status, xhr.responseText);
                    $("#serverError").text("Грешка при брисању lokacije. Погледајте конзолу за детаље.");
                }
            });
        });

        $("#locationModal").on("show.bs.modal", function () {
            $("#locationName").val("");
            $("#locationAddress").val("");
            $("#locationCity").val("");
            $("#locationDescription").val("");
            $("#locationFormError").text("");
            createWorkHoursForm();
        });

