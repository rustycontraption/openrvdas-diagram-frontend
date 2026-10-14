'use client'

import { Container, Title } from "@mantine/core";
import classes from "@/components/Page.module.css";

export default function Home() {
    return (
        <div>
            <Title className={classes.title}>
                {`OpenRVDAS Diagram`}
            </Title>
            <div style={{ height: 50 }}></div>
            <Container className={classes.content} size="xl">
            </Container>
        </div>
    )
}
