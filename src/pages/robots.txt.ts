import { GetServerSideProps } from "next";

const DATA = `User-agent: *

Sitemap: https://blog.hpp2334.com/sitemap.xml
`

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
    res.setHeader("Content-Type", "text/plain");
    // we send the XML to the browser
    res.write(DATA);
    res.end();

    return {
        props: {},
    };
};

export default function RobotsTxt() { };
