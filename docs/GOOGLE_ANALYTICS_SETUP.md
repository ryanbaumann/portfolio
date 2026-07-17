# Google Analytics setup

The production portfolio loads GA4 by default when a Measurement ID is configured. Advertising storage and personalization signals stay denied. Page locations are stripped to origin and path, with only four validated campaign parameters sent separately. Ryan’s Lab applications are not instrumented by the portfolio tag. Setup requires a GA4 web stream and its public Measurement ID.

## 1. Create the GA4 property

1. Open [Google Analytics](https://analytics.google.com/) and select the account that should own this portfolio's data.
2. Open **Admin**, choose **Create**, then **Property**.
3. Name it `Ryan Baumann Portfolio`.
4. Choose the reporting timezone and currency you want to use, complete the business details, then select **Create**.

Google requires an Editor role or higher to create a property. See [Add a GA4 property](https://support.google.com/analytics/answer/9744165).

## 2. Create the web data stream

1. In the new property, open **Admin > Data collection and modification > Data streams**.
2. Select **Web**.
3. Use `https://www.ryanbaumann-portfolio.com` as the website URL and `Ryan Baumann Portfolio` as the stream name.
4. Create the stream.
5. In **Stream details**, copy the Measurement ID. It starts with `G-`. See [Find your Measurement ID](https://support.google.com/analytics/answer/12270356).

Do not paste Google's manual tag snippet into the site. The portfolio build already owns tag loading, privacy boundaries, and event behavior.

## 3. Give the deploy workflow the Measurement ID

1. Open the GitHub repository.
2. Go to **Settings > Secrets and variables > Actions > Variables**.
3. Select **New repository variable**.
4. Name it exactly `ANALYTICS_MEASUREMENT_ID` and paste the `G-...` value.
5. Save it. This ID is public configuration, not a secret.
6. Open **Actions > Deploy to Cloud Run > Run workflow** and run the workflow from `main`, or merge a change to `main` to trigger the normal deploy.

The workflow forwards the variable into the portfolio build. An empty value keeps Analytics disabled.

## 4. Verify collection before looking at reports

1. Open the production site in a fresh private browsing window with content blockers disabled for this test.
2. Open browser developer tools and filter Network requests for `googletagmanager`, `google-analytics`, and `collect`.
3. Reload. Confirm `gtag/js?id=G-...` loads and a GA4 `page_view` request follows.
4. Open a URL containing the approved `utm_source`, `utm_medium`, `utm_campaign`, and `utm_content` fields. Confirm those values appear as campaign parameters while an arbitrary query parameter does not.
5. Navigate to another portfolio page and check **Reports > Realtime** in GA4. Realtime data can take a few minutes to appear.

## 5. Mark a successful contact as a key event

The site sends `generate_lead` only after the email provider confirms delivery and the browser reaches `/contact-success/?delivered=1`.

1. Submit a real test message through the production contact form.
2. In GA4, open **Admin > Data display > Events**.
3. Find `generate_lead` under recent events and select its star to mark it as a key event. If it has not appeared yet, wait for event processing and retry.
4. Verify it in **Reports > Realtime**, then delete or label the test message in the receiving inbox.

Marking an existing event affects reporting from that point forward and can take up to 24 hours to appear in standard reports. See [Mark events as key events](https://support.google.com/analytics/answer/13128484).

## 6. Keep the initial measurement small

Start with the events already emitted by the site:

- `page_view` with sanitized campaign attribution
- `select_content` for work, writing, talk, and demo links
- `share` for article sharing links
- `form_start` and `form_submit`
- `generate_lead` after confirmed delivery
- `sign_up` after a confirmed Field Notes subscription

Do not add form text, names, email addresses, OAuth values, activity IDs, locations, coordinates, route geometry, photos, or raw errors to analytics parameters. The privacy boundary is documented in `portfolio/content/pages/privacy.md`.

For the syndication naming convention and creative-comparison workflow, see [`docs/SYNDICATION.md`](SYNDICATION.md).
