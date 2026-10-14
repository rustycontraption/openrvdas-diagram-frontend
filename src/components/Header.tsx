'use client'

import Link from 'next/link'
import { Container } from '@mantine/core';
import classes from './Header.module.css';
import { ThemeToggle } from "../components/ThemeToggle";

export default function Header() {
    return (
        <header className={classes.header}>
            <Container fluid size="md">
                <div className={classes.inner}>
                    <Link href="/" className={classes.link}>
                        OpenRVDAS Diagram
                    </Link>
                    <ThemeToggle className={classes.link} />
                </div>
            </Container>
        </header>
    );
}
