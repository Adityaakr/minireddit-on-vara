import './home.scss';

function Home() {
  const previewItems = [
    {
      handle: '@navin.vr',
      text: 'For shipping the Mini Reddit integration in one sprint – absolute beast mode.',
    },
    {
      handle: '@0xpriya',
      text: 'For catching a sneaky race condition in review and saving us a launch-day fire.',
    },
    {
      handle: '@dao-core',
      text: 'For holding the community together through every testnet and mainnet hop.',
    },
  ];

  return (
    <section className="home-hero">
      <div className="home-hero__copy">
        <p className="home-hero__eyebrow">On-chain kudos wall</p>
        <h1 className="home-hero__title">
          Celebrate contributions,
          <br />
          on-chain, forever.
        </h1>
        <p className="home-hero__subtitle">
          Drop permanent kudos for your frens, teammates, and community members.
          Every note lives on-chain as a tiny, immutable thank you.
        </p>
        <div className="home-hero__cta-row">
          <span className="home-hero__pill">Connect your wallet above to start</span>
          <span className="home-hero__hint">No gas drama. Just good vibes.</span>
        </div>
      </div>

      <div className="home-hero__preview-wrap">
        <div className="home-hero__preview-glow" />
        <div className="home-hero__preview-card">
          <header className="home-hero__preview-header">
            <div className="home-hero__preview-status">
              <span className="home-hero__preview-dot" />
              <span className="home-hero__preview-label">Live kudos feed</span>
            </div>
            <span className="home-hero__preview-meta">Vara network · ~2s finality</span>
          </header>

          <div className="home-hero__preview-list">
            {previewItems.map((item) => (
              <article key={item.handle} className="home-hero__preview-item">
                <div className="home-hero__preview-item-top">
                  <span className="home-hero__preview-handle">{item.handle}</span>
                  <span className="home-hero__preview-kudos">+1 kudos</span>
                </div>
                <p className="home-hero__preview-text">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export { Home };
