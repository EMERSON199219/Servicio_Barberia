exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Método no permitido" }),
    };
  }

  let reservation;
  try {
    reservation = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Cuerpo inválido" }),
    };
  }

  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  const SENDGRID_FROM = process.env.SENDGRID_FROM;
  const SENDGRID_TO = process.env.SENDGRID_TO || "esquivelrangelemerson37@gmail.com";

  // Log presence of env vars (no secrets)
  console.log("SendGrid config - hasApiKey:", !!SENDGRID_API_KEY, "hasFrom:", !!SENDGRID_FROM, "to:", SENDGRID_TO);

  if (!SENDGRID_API_KEY || !SENDGRID_FROM) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Configuración de correo incompleta. Define SENDGRID_API_KEY y SENDGRID_FROM en las variables de entorno.",
      }),
    };
  }

  const emailBody = `Nueva reserva recibida:\n\nNombre: ${reservation.name}\nTeléfono: ${reservation.phone}\nServicio: ${reservation.service}\nBarbero: ${reservation.barber}\nFecha: ${reservation.date}\nHora: ${reservation.time}\n`;

  const payload = {
    personalizations: [
      {
        to: [{ email: SENDGRID_TO }],
        subject: `Nueva reserva barbería: ${reservation.name}`,
      },
    ],
    from: { email: SENDGRID_FROM },
    content: [
      {
        type: "text/plain",
        value: emailBody,
      },
    ],
  };

  // Use native https request to avoid relying on global fetch in the function runtime
  const https = require("https");

  function sendToSendGrid(payloadObj, apiKey) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(payloadObj);
      const options = {
        hostname: "api.sendgrid.com",
        path: "/v3/mail/send",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "Content-Length": Buffer.byteLength(data),
        },
      };

      const req = https.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, body });
          } else {
            reject(new Error(`SendGrid status ${res.statusCode}: ${body}`));
          }
        });
      });

      req.on("error", (err) => reject(err));
      req.write(data);
      req.end();
    });
  }

  try {
    const resp = await sendToSendGrid(payload, SENDGRID_API_KEY);
    console.log("SendGrid response:", resp.statusCode);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Correo enviado" }),
    };
  } catch (error) {
    console.error("Error enviando correo a SendGrid:", error);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: error.message || "Error enviando correo" }),
    };
  }
};
