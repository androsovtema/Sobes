import {
  Html, Head, Preview, Body, Container,
  Section, Heading, Text, Button, Hr, Link,
} from "@react-email/components";

interface ScheduledEmailProps {
  candidateFirstName: string;
  positionTitle: string;
  companyName: string;
  scheduledAt: Date;
  meetLink: string | null;
  dashboardUrl: string;
}

function formatDate(d: Date) {
  return d.toLocaleString("ru-RU", {
    weekday: "long", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow",
  });
}

export function ScheduledEmail({
  candidateFirstName,
  positionTitle,
  companyName,
  scheduledAt,
  meetLink,
  dashboardUrl,
}: ScheduledEmailProps) {
  return (
    <Html lang="ru">
      <Head />
      <Preview>
        Встреча подтверждена: {positionTitle} в {companyName} — {formatDate(scheduledAt)}
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Heading style={styles.brand}>Собес</Heading>
          </Section>

          <Section style={styles.card}>
            <Text style={styles.emoji}>✅</Text>
            <Heading as="h2" style={styles.title}>
              Встреча подтверждена
            </Heading>
            <Text style={styles.text}>
              Привет, {candidateFirstName}!
            </Text>
            <Text style={styles.text}>
              Вы приняли приглашение от{" "}
              <strong>{companyName}</strong> на позицию{" "}
              <strong>{positionTitle}</strong>.
            </Text>

            {/* Meeting details box */}
            <Section style={styles.detailsBox}>
              <Text style={styles.detailLabel}>Дата и время</Text>
              <Text style={styles.detailValue}>{formatDate(scheduledAt)}</Text>

              {meetLink && (
                <>
                  <Text style={{ ...styles.detailLabel, marginTop: "12px" }}>
                    Ссылка на встречу
                  </Text>
                  <Link href={meetLink} style={styles.meetLinkText}>
                    {meetLink}
                  </Link>
                </>
              )}

              {!meetLink && (
                <>
                  <Text style={{ ...styles.detailLabel, marginTop: "12px" }}>
                    Ссылка на встречу
                  </Text>
                  <Text style={{ ...styles.detailValue, color: "#92400e", fontSize: "13px" }}>
                    HR добавит ссылку Яндекс Телемост в ближайшее время
                  </Text>
                </>
              )}
            </Section>

            {meetLink && (
              <Button href={meetLink} style={styles.button}>
                Открыть встречу в Телемост
              </Button>
            )}

            {!meetLink && (
              <Button href={dashboardUrl} style={styles.buttonSecondary}>
                Открыть кабинет
              </Button>
            )}

            <Hr style={styles.hr} />
            <Text style={styles.footer}>
              Если у вас изменились планы — свяжитесь с компанией напрямую.
            </Text>
          </Section>

          <Text style={styles.footerOuter}>
            Собес · Платформа умного найма
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: "#f4f4f5",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    margin: 0,
    padding: 0,
  },
  container: {
    maxWidth: "560px",
    margin: "0 auto",
    padding: "32px 16px",
  },
  header: { marginBottom: "16px" },
  brand: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#18181b",
    margin: 0,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e4e4e7",
    padding: "32px",
  },
  emoji: {
    fontSize: "32px",
    margin: "0 0 8px 0",
  },
  title: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#18181b",
    marginTop: 0,
    marginBottom: "16px",
  },
  text: {
    fontSize: "15px",
    color: "#3f3f46",
    lineHeight: "1.6",
    margin: "0 0 12px 0",
  },
  detailsBox: {
    backgroundColor: "#f0fdf4",
    borderRadius: "8px",
    border: "1px solid #bbf7d0",
    padding: "16px",
    margin: "16px 0",
  },
  detailLabel: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#71717a",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    margin: 0,
  },
  detailValue: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#18181b",
    margin: "4px 0 0 0",
  },
  meetLinkText: {
    fontSize: "13px",
    color: "#2563eb",
    margin: "4px 0 0 0",
    wordBreak: "break-all" as const,
  },
  button: {
    backgroundColor: "#18181b",
    color: "#ffffff",
    borderRadius: "8px",
    padding: "12px 24px",
    fontSize: "14px",
    fontWeight: "600",
    textDecoration: "none",
    display: "inline-block",
    marginTop: "8px",
  },
  buttonSecondary: {
    backgroundColor: "#f4f4f5",
    color: "#18181b",
    borderRadius: "8px",
    padding: "12px 24px",
    fontSize: "14px",
    fontWeight: "600",
    textDecoration: "none",
    display: "inline-block",
    marginTop: "8px",
    border: "1px solid #e4e4e7",
  },
  hr: {
    borderColor: "#e4e4e7",
    margin: "24px 0 16px 0",
  },
  footer: {
    fontSize: "12px",
    color: "#a1a1aa",
    margin: 0,
  },
  footerOuter: {
    fontSize: "12px",
    color: "#a1a1aa",
    textAlign: "center" as const,
    marginTop: "16px",
  },
} as const;
