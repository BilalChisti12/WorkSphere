import { useRouter } from 'next/router';

export default function Background() {
  const router = useRouter();
  const isProfile = router.pathname.startsWith('/profile');

  return (
    <div className="global-background">
      {isProfile ? (
        <div className="bg-profile">
          <div className="geo geo-dark-cube"></div>
          <div className="geo geo-line-grid"></div>
          <div className="geo geo-grey-circle"></div>
        </div>
      ) : (
        <div className="bg-default">
          <div className="geo geo-beige-square"></div>
          <div className="geo geo-rust-circle"></div>
          <div className="geo geo-grey-circle-large"></div>
          <div className="geo geo-rust-line"></div>
          <div className="geo geo-navy-blob"></div>
        </div>
      )}
      
      <style jsx>{`
        .global-background {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: -10;
          pointer-events: none;
          overflow: hidden;
          background-color: var(--color-bg);
          transition: background-color 0.5s ease;
        }

        .geo {
          position: absolute;
          opacity: 0.8;
        }

        .bg-default {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .geo-beige-square {
          width: 60vw;
          height: 120vh;
          background: linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 100%);
          transform: rotate(-15deg);
          top: -20vh;
          left: -10vw;
          border-radius: 100px;
        }

        .geo-grey-circle-large {
          width: 800px;
          height: 800px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(212,214,219,0.5) 0%, rgba(212,214,219,0) 70%);
          top: -10%;
          right: -10%;
        }

        .geo-rust-circle {
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(203,124,99,0.15) 0%, rgba(203,124,99,0) 70%);
          bottom: -10%;
          left: 10%;
        }

        .geo-rust-line {
          width: 40vw;
          height: 2px;
          background: var(--color-accent);
          top: 75vh;
          left: 0;
          opacity: 0.6;
        }

        .geo-navy-blob {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(52,53,85,0.05) 0%, rgba(52,53,85,0) 70%);
          bottom: 10%;
          right: 20%;
          border-radius: 50%;
        }

        .bg-profile {
          width: 100%;
          height: 100%;
          position: relative;
          background: #e5e7eb;
        }

        .geo-dark-cube {
          width: 40vw;
          height: 100vh;
          background: linear-gradient(45deg, #1f2937, #374151);
          clip-path: polygon(0 0, 100% 0, 70% 100%, 0% 100%);
          top: 0;
          left: 0;
          opacity: 0.8;
        }

        .geo-line-grid {
          width: 100%;
          height: 100%;
          background-image: 
            linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px);
          background-size: 50px 50px;
        }

        .geo-grey-circle {
          width: 600px;
          height: 600px;
          border-radius: 50%;
          border: 1px solid rgba(0,0,0,0.1);
          top: 20%;
          right: 10%;
        }
      `}</style>
    </div>
  );
}
