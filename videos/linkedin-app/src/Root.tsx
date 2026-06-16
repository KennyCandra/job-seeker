import { Composition } from "remotion";
import { LinkedInAppVideo } from "./Video";

export function RemotionRoot() {
  return (
    <Composition
      id="LinkedInApp"
      component={LinkedInAppVideo}
      durationInFrames={900}
      fps={30}
      width={1080}
      height={1350}
      defaultProps={{}}
    />
  );
}
