const status = document.getElementById("billing-result-status");
const state = document.querySelector("[data-billing-result]")?.dataset
  .billingResult;
let attempt = 0;
async function check() {
  try {
    const response = await fetch("/v1/browser/session", {
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw Error();
    const account = await response.json();
    if (!account.authenticated) {
      status.textContent =
        "Sign in to your account to check your subscription, or refresh the allowance in the desktop app.";
      return;
    }
    if (account.usage?.plan === "paid") {
      status.textContent = `Your Plus allowance is active: ${account.usage.remaining} of ${account.usage.limit} answers remaining.`;
      return;
    }
    if (state === "success" && attempt++ < 4) {
      status.textContent =
        "Waiting for signed payment confirmation. Your current allowance stays available.";
      setTimeout(check, 2000);
      return;
    }
    status.textContent = `Your current plan is ${account.usage?.plan === "free" ? "Free preview" : "being checked"}. Open your account for the latest allowance and billing controls.`;
  } catch {
    status.textContent =
      "Your subscription could not be checked here. Open your account or refresh the allowance in the desktop app.";
  }
}
void check();
