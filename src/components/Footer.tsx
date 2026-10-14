import classes from "./Footer.module.css";
import { Container, Group } from "@mantine/core";
import { FaGithub } from "react-icons/fa";

export default function Footer() {
    return (
        <footer className={classes.footer}>
            <Container className={classes.inner}>
                <Group>
                    © 2026 Anne Julian
                </Group>
                <Group>
                    <a href="https://github.com/rustycontraption/openrvdas-diagram" aria-label="openrvdas-diagram on GitHub"><FaGithub size={22} /></a>
                </Group>
            </Container>
        </footer>
    )
}
