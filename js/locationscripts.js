        const API_TOKEN = "q0GSu3yJd74HpF6wV6tnhuWDffGjlciIE5tIrpx3SnoOXCabD2FUsLZIqCahtjWjy0PL4KSd8wxAbHKYyFPpZ8CsYD";
        const API_BASE = "https://vsis.mef.edu.rs/projekat/ulaznice/public_html/api";
        const SESSION_TOKEN = localStorage.getItem("token");

        // Globalne funkcije za pretvaranje vremena
        function minutesToTime(minutes) {
            const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
            const mins = (minutes % 60).toString().padStart(2, '0');
            return `${hours}:${mins}`;
        }

        function timeToMinutes(timeStr) {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        }

        // Provera sesije
        $(document).ready(function () {
            if (!SESSION_TOKEN) {
                $("#serverError").text("Нисте пријављени. Враћате се на почетну страницу...");
                setTimeout(() => {
                    window.location.href = "prijava.html";
                }, 2000);
                return;
            }
            loadLocation();
        });

        // Učitavanje podataka lokaije
        function loadLocation() {
            const urlParams = new URLSearchParams(window.location.search);
            const id = urlParams.get("id");
            if (!id) {
                $("#serverError").text("ID локације није пронађен.");
                return;
            }

            $.ajax({
                url: `${API_BASE}/lokacija/${id}?apitoken=${API_TOKEN}`,
                type: "GET",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${SESSION_TOKEN}`
                },
                success: function (res) {
                    $("#locationId").val(res.id);
                    $("#locationName").val(res.naziv || "");
                    $("#locationAddress").val(res.adresa || "");
                    $("#locationCity").val(res.grad || "");
                    $("#locationDescription").val(res.opis || "");

                    // Prikaz radnog vremena
                    $("#workingHoursList").empty();
                    if (res.radnoVreme && Array.isArray(res.radnoVreme)) {
                        res.radnoVreme.forEach((wh, index) => {
                            addWorkingHourRow(index, wh.dan, wh.od, wh.do);
                        });
                    } else {
                        addWorkingHourRow(0); 
                    }
                },
                error: function (xhr) {
                    console.error("Greška pri učitavanju lokaije:", xhr.status, xhr.responseText);
                    $("#serverError").text("Грешка при учитавању lokaije. Погледајте конзолу za детаље.");
                }
            });
        }

        // Dodavanje reda za radno vreme
        function addWorkingHourRow(index, day = 1, from = 480, to = 960) {
            const dayOptions = [
                { value: 1, label: "Понедељак" },
                { value: 2, label: "Уторак" },
                { value: 3, label: "Среда" },
                { value: 4, label: "Четвртак" },
                { value: 5, label: "Петак" },
                { value: 6, label: "Субота" },
                { value: 7, label: "Недеља" }
            ];

            const $row = $(`
                <div class="row" id="workingHourRow-${index}">
                    <div class="col-md-4">
                        <select class="form-control" id="day-${index}" required>
                            ${dayOptions.map(opt => `<option value="${opt.value}" ${opt.value === day ? 'selected' : ''}>${opt.label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-4">
                        <input type="time" class="form-control" id="from-${index}" value="${minutesToTime(from)}" required>
                    </div>
                    <div class="col-md-3">
                        <input type="time" class="form-control" id="to-${index}" value="${minutesToTime(to)}" required>
                    </div>
                    <div class="col-md-1">
                        <button type="button" class="btn btn-danger btn-sm remove-working-hour" data-index="${index}">Уклони</button>
                    </div>
                </div>
            `);
            $("#workingHoursList").append($row);
        }

        // Dodavanje novog reda za radno vreme
        $("#addWorkingHour").click(function () {
            const index = $("#workingHoursList .row").length;
            addWorkingHourRow(index);
        });

        // Uklanjanje reda za radno vreme
        $(document).on("click", ".remove-working-hour", function () {
            const index = $(this).data("index");
            $(`#workingHourRow-${index}`).remove();
        });

        // Validacija
        function validateForm() {
            let isValid = true;
            $("#nameError, #addressError, #cityError, #descriptionError, #workingHoursError").text("");

            if (!$("#locationName").val().trim()) {
                $("#nameError").text("Назив локације је обавезан.");
                isValid = false;
            }
            if (!$("#locationAddress").val().trim()) {
                $("#addressError").text("Адреса је обавезна.");
                isValid = false;
            }
            if (!$("#locationCity").val().trim()) {
                $("#cityError").text("Град је обавезан.");
                isValid = false;
            }
            const workingHours = $("#workingHoursList .row");
            if (workingHours.length === 0) {
                $("#workingHoursError").text("Мора постојати барем један унос радног времена.");
                isValid = false;
            }
            workingHours.each(function () {
                const index = $(this).attr("id").split("-")[1];
                if (!$(`#day-${index}`).val() || !$(`#from-${index}`).val() || !$(`#to-${index}`).val()) {
                    $("#workingHoursError").text("Сва поља радног времена су обавезна.");
                    isValid = false;
                    return false;
                }
            });

            return isValid;
        }

        // Slanje forme
        $("#locationForm").on("submit", function (e) {
            e.preventDefault();

            if (!validateForm()) return;

            const id = $("#locationId").val();
            const workingHours = [];
            $("#workingHoursList .row").each(function () {
                const index = $(this).attr("id").split("-")[1];
                workingHours.push({
                    dan: parseInt($(`#day-${index}`).val()),
                    od: timeToMinutes($(`#from-${index}`).val()),
                    do: timeToMinutes($(`#to-${index}`).val())
                });
            });

            const data = {
                name: $("#locationName").val().trim(),
                address: $("#locationAddress").val().trim(),
                city: $("#locationCity").val().trim(),
                description: $("#locationDescription").val().trim() || null,
                workingHours: JSON.stringify(workingHours),
                apitoken: API_TOKEN
            };

            console.log("Slanje podataka:", data); 

            $.ajax({
                url: `${API_BASE}/lokacija/${id}`,
                type: "PATCH", 
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${SESSION_TOKEN}`,
                    "Content-Type": "application/json"
                },
                data: JSON.stringify(data), 
                success: function (response) {
                    $("#statusMessage").text("Локација успешно измењена.").removeClass("error").addClass("success");
                },
                error: function (xhr) {
                    console.error("Greška pri čuvanju lokaije:", xhr.status, xhr.responseText);
                    let msg = `Грешка (status: ${xhr.status})`;
                    try {
                        const err = JSON.parse(xhr.responseText);
                        if (err?.message) msg = err.message;
                        if (err?.errors) msg += " — " + Object.values(err.errors).join(" ");
                    } catch (e) {
                        msg += " — Server nije vratio detalje greške.";
                    }
                    $("#statusMessage").text(msg).addClass("error").removeClass("success");
                }
            });
        });

        $("#backButton").click(function () {
            window.location.href = "admin.html";
        });