# Field Notes syndication

Field Notes owns the content. Resend owns the email audience. Substack,
LinkedIn, and X are distribution channels that point readers back to the
canonical post on this site.

## The simple publishing loop

1. Draft and review the Markdown post through `/writer/`.
2. Publish the site version first and verify its canonical URL, social image,
   summary, and tags.
3. Prepare one small syndication kit:
   - canonical URL;
   - title, summary, image, image alt text, and up to three tags;
   - one short excerpt for Substack;
   - two LinkedIn hooks;
   - two X hooks or one short thread;
   - one tracked URL for each hook.
4. Review the kit, then publish manually to each channel.
5. Record the channel URL, hook variant, and publication time with the post.
6. Compare channel-native reach with site sessions, subscriptions, and
   contact completions.

Manual distribution is the right first version. Substack does not offer an
official write API. LinkedIn automation requires an approved app and OAuth.
X posting requires a developer app and paid API usage. Automation only pays
after the manual loop shows which channels and formats are worth maintaining.

## Channel format

| Channel | Publish | Why |
| --- | --- | --- |
| Substack | A short excerpt or Note with a tracked link to the full Field Note. | Preserves the site as the archive and avoids relying on an external canonical setting that Substack does not document. Its RSS importer is useful for migrations, not selective ongoing syndication. |
| LinkedIn | A native feed post with a strong opening, the social image, and a tracked link. | Followers stay native to LinkedIn, while the complete argument and subscription conversion happen on the site. A LinkedIn newsletter is optional duplicate distribution, not the email-list source of truth. |
| X | A concise post or short thread with the tracked link in the closing post. | Keeps the workflow fast. Use the API only if manual publishing becomes a proven bottleneck. |

Official capability references: [Substack post import](https://support.substack.com/hc/en-us/articles/360037830351-How-do-I-import-my-posts-from-another-platform-such-as-Mailchimp-WordPress-Medium-or-Ghost), [LinkedIn newsletters](https://www.linkedin.com/help/linkedin/answer/a524002), [LinkedIn RSS content sharing for Pages](https://www.linkedin.com/help/linkedin/answer/a6806906), and [X post creation](https://docs.x.com/x-api/posts/manage-tweets/introduction).

## Attribution and creative comparisons

Use one controlled UTM vocabulary:

| Parameter | Values |
| --- | --- |
| `utm_source` | `linkedin`, `x`, `substack`, `field_notes` |
| `utm_medium` | `organic_social`, `referral`, `email` |
| `utm_campaign` | `fn_<slug>_<yyyymm>` |
| `utm_content` | `post_hook_a`, `post_hook_b`, `thread_hook_a`, `excerpt_cta_a` |

Example:

```text
https://www.ryanbaumann-portfolio.com/writing/loop-engineering-coding-agent/?utm_source=linkedin&utm_medium=organic_social&utm_campaign=fn_loop_engineering_202607&utm_content=post_hook_a
```

The portfolio sends only these four allowlisted values to Google Analytics.
All other query parameters remain excluded. `utm_content` distinguishes hooks
and creative treatments. Organic comparisons are not randomized A/B tests,
so change one variable at a time and compare several releases before drawing
a conclusion. Use a true split test only with randomly assigned email or paid
campaign audiences.

Measure a short funnel:

1. Native impressions and engagement from each channel.
2. Site sessions by source, campaign, and content variant.
3. Confirmed `sign_up` events.
4. Confirmed `generate_lead` events.

See [Google's campaign URL guidance](https://support.google.com/analytics/answer/10917952).

## Email audience ownership

Resend is the master email list unless paid Substack subscriptions become a
requirement. The site signup writes a global Resend Contact, adds it to the
Field Notes Segment, and opts it into the Field Notes Topic. The Topic owns
the reader's unsubscribe preference. The Segment is only an internal sending
group.

For a one-time Substack migration:

1. Export active Substack subscribers to CSV.
2. Keep only people who explicitly opted in to receive this publication.
3. Normalize and deduplicate by email. An unsubscribe or suppression always
   wins over an active record.
4. Preserve source and original signup date when available.
5. Import the clean list into Resend, add it to the Field Notes Segment, and
   opt it into the Field Notes Topic.
6. Send a transparent migration notice from the publication the reader
   originally joined.
7. Stop sending the same update from both systems.

Do not build bidirectional Resend and Substack synchronization. Substack has
CSV import and export but no supported subscriber webhook or write API, so a
continuous sync can miss unsubscribes and create duplicate mail. References:
[Substack subscriber import](https://support.substack.com/hc/en-us/articles/360037829931-How-do-I-import-my-mailing-list-from-another-platform-such-as-Mailchimp-Ghost-or-Beehiiv), [Substack export](https://support.substack.com/hc/en-us/articles/6314498343700-How-do-I-export-my-email-list-on-Substack), and [Resend Contacts, Segments, and Topics](https://resend.com/docs/dashboard/audiences/introduction).

If paid Substack subscriptions become important, reverse the decision:
Substack should own subscriber and billing state, and the site should link to
its signup instead of maintaining a parallel marketing list.

## Followers are not email subscribers

Do not add LinkedIn or X followers, connections, or scraped contacts to the
email list. A follow is not consent to receive email. LinkedIn followers and
newsletter subscribers are platform identities, not a mergeable email list,
and LinkedIn does not support merging or transferring newsletter followers.

Use channel CTAs and tracked profile links to let each person opt in on the
site. This produces a smaller list with clear provenance, safer deliverability,
and honest channel attribution.

## Later automation

After the workflow is proven, add a private `/writer/` syndication panel that
generates the reviewed kit and stores publication URLs. Automate LinkedIn and
X posting only if manual publishing is the actual bottleneck. Keep Substack
manual until it offers an official write API.
