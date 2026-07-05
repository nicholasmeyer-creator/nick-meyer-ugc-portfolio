const jsonHeaders = {
  "Content-Type": "application/json"
};

function clean(value) {
  return String(value || "").trim();
}

function buildText({ name, brand, email, project, brief }) {
  return [
    "New UGC brief from nicholasmeyer.co.za",
    "",
    `Name: ${name}`,
    `Brand: ${brand || "Not added"}`,
    `Email: ${email}`,
    `Project type: ${project || "Not selected"}`,
    "",
    "Brief:",
    brief
  ].join("\n");
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Only POST requests are allowed." });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL || "hey@nicholasmeyer.co.za";
  const fromEmail = process.env.CONTACT_FROM_EMAIL || "Nick Meyer <enquiry@nicholasmeyer.co.za>";

  if (!resendApiKey) {
    return response.status(503).json({ error: "Email sending is not configured yet." });
  }

  const body = request.body || {};
  const submission = {
    name: clean(body.name),
    brand: clean(body.brand),
    email: clean(body.email),
    project: clean(body.project),
    brief: clean(body.brief)
  };

  if (!submission.name || !submission.email || !submission.brief) {
    return response.status(400).json({ error: "Name, email and brief are required." });
  }

  const subject = `UGC brief${submission.brand ? ` for ${submission.brand}` : ""}`;
  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      ...jsonHeaders,
      Authorization: `Bearer ${resendApiKey}`
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      reply_to: submission.email,
      subject,
      text: buildText(submission)
    })
  });

  if (!resendResponse.ok) {
    const result = await resendResponse.json().catch(() => ({}));
    return response.status(502).json({
      error: result.message || "Resend could not send the email."
    });
  }

  return response.status(200).json({ ok: true });
}
