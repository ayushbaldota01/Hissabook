import { interpolate, useCurrentFrame, Easing, useVideoConfig } from 'remotion';

export const Silo = ({
  weight,
  moisture,
  startFrame
}: {
  weight: number;
  moisture: number; // e.g. 16.5
  startFrame: number;
}) => {
  const frame = useCurrentFrame() - startFrame;
  const { fps: realFps } = useVideoConfig();
  const fps = realFps / 1.5;

  // Calculations similar to the web app
  const m = moisture;
  const Wa = weight * (1 - m / 100);
  const Wb = m > 10 ? weight - weight * ((m - 10) / 100) : Wa;
  
  const hDry = Wa / weight * 100;
  const hWet = (Wb - Wa) / weight * 100;
  const hExc = (weight - Wb) / weight * 100;

  // Animations
  const animProg = interpolate(frame, [10, fps * 1.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 0.8, 0.25, 1)
  });

  return (
    <div style={{
      position: 'relative',
      width: 200,
      height: 500,
      borderRadius: 999,
      border: '2px solid #D5DCD7',
      backgroundColor: '#F9FAF8',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column-reverse',
      boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
    }}>
      {/* Glossy overlay */}
      <div style={{
        position: 'absolute',
        top: '6%',
        bottom: '6%',
        left: '16%',
        width: '9%',
        borderRadius: 20,
        background: 'linear-gradient(rgba(255,255,255,0.15), rgba(255,255,255,0))',
        pointerEvents: 'none',
        zIndex: 10
      }} />

      {/* Dry Layer */}
      <div style={{
        position: 'relative',
        height: `${hDry * animProg}%`,
        backgroundColor: '#DDA02E',
        backgroundImage: 'radial-gradient(rgba(18,32,29,0.28) 2px, transparent 2.5px)',
        backgroundSize: '12px 12px'
      }} />

      {/* Allowed Moisture */}
      <div style={{
        position: 'relative',
        height: `${hWet * animProg}%`,
        backgroundColor: '#A6CFDC'
      }} />

      {/* Excess Moisture */}
      <div style={{
        position: 'relative',
        height: `${hExc * animProg}%`,
        backgroundColor: '#1E6B88'
      }} />
    </div>
  );
};
