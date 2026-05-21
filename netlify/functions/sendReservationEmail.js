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

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `SendGrid error: ${errorText}` }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Correo enviado" }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Error interno" }),
    };
  }
};
