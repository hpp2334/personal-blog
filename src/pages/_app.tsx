import type { AppProps } from "next/app";
import { Noto_Sans } from "@next/font/google";

const noto = Noto_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <style jsx global>{`
        * {
          padding: 0;
          margin: 0;
        }

        html {
          font-family: ${noto.style.fontFamily};
        }

        body {
          max-width: 100vw;
          min-width: 100vw;
          height: 100vh;
        }

        a {
          text-decoration: none;
          color: black;
        }

        #__next {
          max-height: 100%;
        }
      `}</style>
      <Component {...pageProps} />
    </>
  );
}
