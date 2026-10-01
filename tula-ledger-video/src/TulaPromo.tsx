import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  Img,
  staticFile
} from 'remotion';
import { Silo } from './Silo';

// Palette mapping:
// #0C1513 -> #EEF1ED
// #131F1C -> #F9FAF8
// #E8EEEA -> #12201D
// #8FA19B -> #62716B
// #25352F -> #D5DCD7
// #5CC596 -> #2E7D5B
// #E9B04A -> #DDA02E
// #3F7385 -> #A6CFDC
// #62B3D3 -> #1E6B88

// Scene 1: The Illusion
const Scene1 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const scale = interpolate(frame, [0, fps * 1.5], [0.8, 1.2], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
    easing: Easing.bezier(0.25, 0.8, 0.25, 1)
  });

  const opacityNum = interpolate(frame, [0, fps * 0.5, fps * 2.5, fps * 3.5], [0, 1, 1, 0], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
    easing: Easing.bezier(0.25, 0.8, 0.25, 1)
  });

  const translateY = interpolate(frame, [0, fps * 1.5], [20, -20], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp'
  });

  return (
    <AbsoluteFill style={{
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#EEF1ED',
      color: '#12201D',
      fontFamily: 'Bricolage Grotesque, sans-serif'
    }}>
      <div style={{
        opacity: opacityNum,
        transform: `scale(${scale}) translateY(${translateY}px)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <h1 style={{ fontSize: 180, margin: 0, fontWeight: 800, letterSpacing: '-0.04em' }}>
          100 MT
        </h1>
        <p style={{ fontSize: 40, color: '#62716B', margin: 0, fontWeight: 500, fontFamily: 'Hanken Grotesk, sans-serif' }}>
          You bought 100 tons.
        </p>
      </div>

      <div style={{
        position: 'absolute',
        bottom: '20%',
        opacity: interpolate(frame, [fps * 2, fps * 2.5], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp'
        }),
        color: '#1E6B88',
        fontSize: 50,
        fontWeight: 600,
        fontFamily: 'Hanken Grotesk, sans-serif'
      }}>
        But what are you really paying for?
      </div>
    </AbsoluteFill>
  );
};

// Scene 2: The Reveal
const Scene2 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const containerY = interpolate(frame, [0, fps], [200, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.spring({ damping: 15, mass: 0.5 })
  });

  const opacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  return (
    <AbsoluteFill style={{
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F9FAF8',
      fontFamily: 'Hanken Grotesk, sans-serif'
    }}>
      <div style={{
        transform: `translateY(${containerY}px)`,
        opacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          marginBottom: 40,
          fontFamily: 'Bricolage Grotesque, sans-serif',
          fontSize: 60,
          fontWeight: 800,
          color: '#12201D'
        }}>
          <div style={{
            width: 30,
            height: 60,
            borderRadius: 14,
            background: 'linear-gradient(to top, #DDA02E 45%, #A6CFDC 45% 70%, #1E6B88 70%)'
          }} />
          Tula
          <span style={{ color: '#62716B', fontSize: 30, marginLeft: 10, fontWeight: 500, fontFamily: 'Hanken Grotesk, sans-serif' }}>
            Raw material ledger
          </span>
        </div>
        
        {/* Mock UI Card */}
        <div style={{
          background: '#EEF1ED',
          border: '1px solid #D5DCD7',
          borderRadius: 24,
          padding: 40,
          width: 600,
          boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
          position: 'relative'
        }}>
          <h2 style={{ margin: '0 0 20px', color: '#12201D', fontSize: 32, fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            Plant Entry
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #D5DCD7', padding: '15px 0' }}>
            <span style={{ color: '#62716B', fontSize: 24 }}>Weight</span>
            <strong style={{ color: '#12201D', fontSize: 24 }}>100 MT</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #D5DCD7', padding: '15px 0' }}>
            <span style={{ color: '#62716B', fontSize: 24 }}>Moisture</span>
            <strong style={{ color: '#12201D', fontSize: 24 }}>16.5%</strong>
          </div>
          
          <div style={{
            position: 'absolute',
            right: -40,
            top: -40,
            background: '#1E6B88',
            color: '#F9FAF8',
            padding: '10px 20px',
            borderRadius: 999,
            fontWeight: 800,
            fontSize: 24,
            transform: `scale(${interpolate(frame, [fps, fps * 1.5], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.spring({ damping: 10 })
            })})`
          }}>
            Alert: High Moisture!
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Scene 3: The Silo Data-Vis
const Scene3 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#EEF1ED',
      flexDirection: 'row',
      gap: 100,
      fontFamily: 'Hanken Grotesk, sans-serif'
    }}>
      <div style={{ transform: `scale(${interpolate(frame, [0, fps], [0.5, 1], { extrapolateRight: 'clamp', easing: Easing.spring({damping: 15}) })})` }}>
        <Silo weight={100} moisture={16.5} startFrame={0} />
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 30, opacity: interpolate(frame, [fps, fps + 15], [0, 1]) }}>
        <h1 style={{ color: '#12201D', fontFamily: 'Bricolage Grotesque, sans-serif', fontSize: 60, margin: 0, maxWidth: 400, lineHeight: 1.1 }}>
          See the dry truth.
        </h1>
        <p style={{ color: '#62716B', fontSize: 30, margin: 0 }}>
          Never pay for water.
        </p>

        <div style={{
          marginTop: 40,
          background: '#F9FAF8',
          padding: 30,
          borderRadius: 20,
          border: '1px solid #D5DCD7'
        }}>
          <div style={{ color: '#62716B', fontSize: 20, marginBottom: 10 }}>Paid for water</div>
          <div style={{ 
            color: '#2E7D5B', 
            fontFamily: 'Bricolage Grotesque, sans-serif', 
            fontSize: 60, 
            fontWeight: 800 
          }}>
            ₹0
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Scene 4: Outro
const Scene4 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = interpolate(frame, [0, fps * 2], [0.8, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 0.8, 0.25, 1)
  });

  return (
    <AbsoluteFill style={{
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F9FAF8',
      fontFamily: 'Hanken Grotesk, sans-serif'
    }}>
      <div style={{
        transform: `scale(${scale})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          marginBottom: 20,
          fontFamily: 'Bricolage Grotesque, sans-serif',
          fontSize: 100,
          fontWeight: 800,
          color: '#12201D'
        }}>
          <div style={{
            width: 50,
            height: 100,
            borderRadius: 24,
            background: 'linear-gradient(to top, #DDA02E 45%, #A6CFDC 45% 70%, #1E6B88 70%)'
          }} />
          Tula
        </div>
        <div style={{ color: '#62716B', fontSize: 36, fontWeight: 500 }}>
          Precision Purchasing.
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const TulaPromo = () => {
  const { fps } = useVideoConfig();
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#EEF1ED' }}>
      <Sequence from={0} durationInFrames={fps * 4}>
        <Scene1 />
      </Sequence>
      
      <Sequence from={fps * 4} durationInFrames={fps * 4}>
        <Scene2 />
      </Sequence>

      <Sequence from={fps * 8} durationInFrames={fps * 6}>
        <Scene3 />
      </Sequence>

      <Sequence from={fps * 14} durationInFrames={fps * 4}>
        <Scene4 />
      </Sequence>
    </AbsoluteFill>
  );
};
