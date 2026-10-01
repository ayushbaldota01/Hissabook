import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring
} from 'remotion';
import { Silo } from './Silo';
import React from 'react';

// Palette mapping to light/beige theme
const colors = {
  bg: '#EEF1ED',
  sur: '#F9FAF8',
  ink: '#12201D',
  mute: '#62716B',
  line: '#D5DCD7',
  dry: '#DDA02E',
  wet: '#A6CFDC',
  exc: '#1E6B88',
  ok: '#2E7D5B'
};

const Title = ({ children, style }: { children: React.ReactNode, style?: React.CSSProperties }) => (
  <h1 style={{ fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 800, margin: 0, color: colors.ink, ...style }}>
    {children}
  </h1>
);

const Subtitle = ({ children, style }: { children: React.ReactNode, style?: React.CSSProperties }) => (
  <p style={{ fontFamily: 'Hanken Grotesk, sans-serif', fontWeight: 500, margin: 0, color: colors.mute, ...style }}>
    {children}
  </p>
);

// Typewriter effect component
const Typewriter = ({ text, startFrame, frame }: { text: string, startFrame: number, frame: number }) => {
  const chars = Math.max(0, Math.floor((frame - startFrame) / 2));
  return <span>{text.substring(0, chars)}</span>;
};

// Scene 1: The Dual Problem
const Scene1 = () => {
  const frame = useCurrentFrame();
  const { fps: realFps } = useVideoConfig();
  const fps = realFps / 1.5;

  const slideLeft = interpolate(frame, [fps * 4, fps * 5], [0, -100], { extrapolateRight: 'clamp', easing: Easing.bezier(0.25, 0.8, 0.25, 1) });
  const slideRight = interpolate(frame, [fps * 4, fps * 5], [0, 100], { extrapolateRight: 'clamp', easing: Easing.bezier(0.25, 0.8, 0.25, 1) });
  const opacity = interpolate(frame, [fps * 4.5, fps * 5], [1, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ flexDirection: 'row', backgroundColor: colors.bg, opacity }}>
      <div style={{ flex: 1, borderRight: `2px solid ${colors.line}`, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', transform: `translateX(${slideLeft}%)` }}>
        <Title style={{ fontSize: 60 }}>The Plant</Title>
        <Subtitle style={{ fontSize: 30, marginTop: 20 }}>
          <Typewriter text="Logs the weight." startFrame={10} frame={frame} />
        </Subtitle>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', transform: `translateX(${slideRight}%)` }}>
        <Title style={{ fontSize: 60 }}>Management</Title>
        <Subtitle style={{ fontSize: 30, marginTop: 20 }}>
          <Typewriter text="Pays the price." startFrame={40} frame={frame} />
        </Subtitle>
      </div>
    </AbsoluteFill>
  );
};

// Scene 2: Plant Entry
const Scene2 = () => {
  const frame = useCurrentFrame();
  const { fps: realFps } = useVideoConfig();
  const fps = realFps / 1.5;

  const scale = spring({ fps, frame, config: { damping: 14 } });
  
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
      <Title style={{ position: 'absolute', top: 80, fontSize: 50, opacity: interpolate(frame, [0, 15], [0, 1]) }}>
        Empower the plant.
      </Title>
      
      <div style={{ display: 'flex', gap: 60, alignItems: 'center', transform: `scale(${scale})` }}>
        {/* Plant Entry Form Mock */}
        <div style={{ width: 500, backgroundColor: colors.sur, padding: 40, borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.05)', border: `1px solid ${colors.line}` }}>
          <Title style={{ fontSize: 30, marginBottom: 10 }}>Log a delivery</Title>
          <Subtitle style={{ marginBottom: 30, fontSize: 18 }}>Enter what arrived at the gate.</Subtitle>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: 'Hanken Grotesk, sans-serif' }}>
            <div style={{ borderBottom: `1px solid ${colors.ink}`, paddingBottom: 10 }}>
              <span style={{ color: colors.mute, fontSize: 14 }}>Supplier</span><br/>
              <strong style={{ fontSize: 20 }}><Typewriter text="Patil Biomass" startFrame={fps} frame={frame} /></strong>
            </div>
            <div style={{ borderBottom: `1px solid ${colors.ink}`, paddingBottom: 10 }}>
              <span style={{ color: colors.mute, fontSize: 14 }}>Weight (MT)</span><br/>
              <strong style={{ fontSize: 20 }}><Typewriter text="30.00" startFrame={fps * 2} frame={frame} /></strong>
            </div>
            <div style={{ borderBottom: `1px solid ${colors.ink}`, paddingBottom: 10 }}>
              <span style={{ color: colors.mute, fontSize: 14 }}>Moisture readings (%)</span><br/>
              <strong style={{ fontSize: 20 }}>
                <Typewriter text="16.5, 15.9, 17.2" startFrame={fps * 3} frame={frame} />
              </strong>
            </div>
          </div>
        </div>

        {/* Silo Visualizer appearing */}
        <div style={{ opacity: interpolate(frame, [fps * 4.5, fps * 5], [0, 1]) }}>
          <Silo weight={30} moisture={16.53} startFrame={fps * 4.5} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Scene 3: Management Ledger
const Scene3 = () => {
  const frame = useCurrentFrame();
  const { fps: realFps } = useVideoConfig();
  const fps = realFps / 1.5;

  const slideUp = interpolate(frame, [0, fps], [100, 0], { extrapolateRight: 'clamp', easing: Easing.bezier(0.25, 0.8, 0.25, 1) });
  
  const showRate = frame > fps * 3;
  const rateOpacity = interpolate(frame, [fps * 3, fps * 3.5], [0, 1]);
  const highlightFlash = interpolate(frame, [fps * 4, fps * 4.5, fps * 5], [0, 1, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, alignItems: 'center', paddingTop: 100 }}>
      <Title style={{ fontSize: 50, opacity: interpolate(frame, [0, 15], [0, 1]) }}>
        Unify with Management.
      </Title>
      <Subtitle style={{ fontSize: 24, marginTop: 10, opacity: interpolate(frame, [0, 15], [0, 1]) }}>
        Real-time rates & totals.
      </Subtitle>

      <div style={{ transform: `translateY(${slideUp}px)`, marginTop: 60, width: '90%', backgroundColor: colors.sur, borderRadius: 20, padding: 30, border: `1px solid ${colors.line}`, boxShadow: '0 20px 40px rgba(0,0,0,0.05)', fontFamily: 'Hanken Grotesk, sans-serif' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: colors.mute, borderBottom: `2px solid ${colors.ink}` }}>
              <th style={{ padding: 15 }}>Supplier</th>
              <th style={{ padding: 15 }}>Material</th>
              <th style={{ padding: 15 }}>Actual (MT)</th>
              <th style={{ padding: 15 }}>Avg moisture</th>
              <th style={{ padding: 15 }}>Rate (₹)</th>
              <th style={{ padding: 15 }}>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: 15, fontWeight: 600 }}>Patil Biomass</td>
              <td style={{ padding: 15 }}>Corncob</td>
              <td style={{ padding: 15 }}>30.00</td>
              <td style={{ padding: 15, color: colors.exc, fontWeight: 600 }}>16.53%</td>
              <td style={{ padding: 15 }}>
                <div style={{ borderBottom: `1px solid ${colors.ink}`, display: 'inline-block', width: 80 }}>
                  <span style={{ opacity: rateOpacity }}><Typewriter text="5000" startFrame={fps * 3} frame={frame} /></span>
                  {frame > fps * 2 && frame < fps * 4 && <span style={{ borderRight: `2px solid ${colors.ink}`, animation: 'blink 1s infinite' }} />}
                </div>
              </td>
              <td style={{ padding: 15, fontWeight: 800, fontSize: 20 }}>
                {frame > fps * 4 ? (
                  <span style={{ position: 'relative' }}>
                    ₹1,40,205
                    <div style={{ position: 'absolute', top: -5, left: -10, right: -10, bottom: -5, backgroundColor: colors.ok, opacity: highlightFlash, borderRadius: 5 }} />
                  </span>
                ) : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AbsoluteFill>
  );
};

// Scene 4: Analytics
const Scene4 = () => {
  const frame = useCurrentFrame();
  const { fps: realFps } = useVideoConfig();
  const fps = realFps / 1.5;

  const scale = spring({ fps, frame, config: { damping: 14 } });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ transform: `scale(${scale})`, display: 'flex', flexDirection: 'column', gap: 40, alignItems: 'center' }}>
        <Title style={{ fontSize: 70, textAlign: 'center' }}>Know your true costs.</Title>
        
        <div style={{ display: 'flex', gap: 40 }}>
          <div style={{ backgroundColor: colors.sur, padding: 40, borderRadius: 20, border: `1px solid ${colors.line}`, minWidth: 300, textAlign: 'center' }}>
            <Subtitle style={{ fontSize: 20 }}>Total purchase value</Subtitle>
            <Title style={{ fontSize: 50, marginTop: 10 }}>₹1,40,205</Title>
          </div>
          <div style={{ backgroundColor: colors.sur, padding: 40, borderRadius: 20, border: `1px solid ${colors.line}`, minWidth: 300, textAlign: 'center' }}>
            <Subtitle style={{ fontSize: 20 }}>Paid for water</Subtitle>
            <Title style={{ fontSize: 50, marginTop: 10, color: colors.ok }}>₹0</Title>
          </div>
        </div>

        <div style={{ backgroundColor: colors.sur, padding: 40, borderRadius: 20, border: `1px solid ${colors.line}`, width: '100%', boxSizing: 'border-box' }}>
          <Title style={{ fontSize: 24, marginBottom: 20 }}>Moisture by supplier</Title>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15, fontFamily: 'Hanken Grotesk, sans-serif' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
              <span style={{ width: 120 }}>Patil Biomass</span>
              <div style={{ flex: 1, height: 10, backgroundColor: colors.line, borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ width: `${interpolate(frame, [fps, fps * 2], [0, 80], {extrapolateRight: 'clamp'})}%`, height: '100%', backgroundColor: colors.exc }} />
              </div>
              <strong style={{ color: colors.exc }}>16.5%</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
              <span style={{ width: 120 }}>Om Sawmill</span>
              <div style={{ flex: 1, height: 10, backgroundColor: colors.line, borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ width: `${interpolate(frame, [fps*1.5, fps * 2.5], [0, 40], {extrapolateRight: 'clamp'})}%`, height: '100%', backgroundColor: colors.dry }} />
              </div>
              <strong>8.7%</strong>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Scene 5: Outro
const Scene5 = () => {
  const frame = useCurrentFrame();
  const { fps: realFps } = useVideoConfig();
  const fps = realFps / 1.5;

  const scale = interpolate(frame, [0, fps * 2], [0.8, 1], { extrapolateRight: 'clamp', easing: Easing.bezier(0.25, 0.8, 0.25, 1) });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.sur, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ transform: `scale(${scale})`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
          <div style={{ width: 50, height: 100, borderRadius: 24, background: `linear-gradient(to top, ${colors.dry} 45%, ${colors.wet} 45% 70%, ${colors.exc} 70%)` }} />
          <Title style={{ fontSize: 120 }}>Tula</Title>
        </div>
        <Subtitle style={{ fontSize: 40 }}>The definitive Raw Material Ledger.</Subtitle>
      </div>
    </AbsoluteFill>
  );
};

export const TulaPromo = () => {
  const { fps: realFps } = useVideoConfig();
  const fps = realFps / 1.5;
  
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <Sequence from={0} durationInFrames={fps * 5}>
        <Scene1 />
      </Sequence>
      
      <Sequence from={fps * 5} durationInFrames={fps * 9}>
        <Scene2 />
      </Sequence>

      <Sequence from={fps * 14} durationInFrames={fps * 10}>
        <Scene3 />
      </Sequence>

      <Sequence from={fps * 24} durationInFrames={fps * 6}>
        <Scene4 />
      </Sequence>

      <Sequence from={fps * 30} durationInFrames={fps * 5}>
        <Scene5 />
      </Sequence>
    </AbsoluteFill>
  );
};
