import { Composition } from "remotion";
import { TulaPromo } from "./TulaPromo";
import React from 'react';

const fontStyles = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700;800&family=Hanken+Grotesk:wght@400;500;600&display=swap');
`;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <style>{fontStyles}</style>
      <Composition
        id="TulaPromo"
        component={TulaPromo}
        durationInFrames={700}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
