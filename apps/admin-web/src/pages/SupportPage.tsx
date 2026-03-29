import { ActionButton, SupportActionCard, SupportStatusBar } from '@bakki/ui';
import { localAssetUrls } from '@bakki/domain';

export function SupportPage() {
  return (
    <section className="view is-active" id="view-support">
      <div className="page-content support-figma-page">
        <section className="support-figma-hero">
          <img alt="Support landscape" src={localAssetUrls.forest} />
          <div className="support-figma-hero-overlay" />
          <div className="support-figma-hero-content">
            <span className="support-figma-badge"><i />TERMINAL SUPPORT</span>
            <h1>System Diagnostic</h1>
          </div>
        </section>

        <SupportStatusBar detail="Last updated: 2 mins ago" label="ALL SYSTEMS OPERATIONAL" />

        <section className="support-figma-actions-grid">
          <SupportActionCard
            heading="Download Server Logs"
            description="Download the logs here and upload them to an AI of your choice. Most of the times it will tell you what is wrong."
            icon="⇩"
            tone="light"
          >
            <ActionButton className="support-figma-primary" label="EXPORT .LOG BUNDLE" />
          </SupportActionCard>

          <SupportActionCard
            compactCopy
            heading="Contact Lorenz"
            icon="⌘"
            tone="dark"
          >
            <div className="support-figma-button-stack">
              <ActionButton className="support-figma-secondary" label="MESSAGE LORENZ" />
              <ActionButton className="support-figma-secondary" label="CALL LORENZ" />
            </div>
          </SupportActionCard>
        </section>
      </div>
    </section>
  );
}
