import {
  Html, Head, Preview, Body, Container,
  Section, Heading, Text, Button, Hr,
} from "@react-email/components";

interface InviteEmailProps {
  candidateFirstName: string;
  positionTitle: string;
  companyName: string;
  proposedSlotAt: Date | null;
  dashboardUrl: string;
}

function formatDate(d: Date) {
  return d.toLocaleString("ru-RU", {
    weekday: "long", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow",
  });
}

export function InviteEmail({
  candidateFirstName,
  positionTitle,
  companyName,
  proposedSlotAt,
  dashboardUrl,
}: InviteEmailProps) {
  return (
    <Html lang="ru">
      <Head />
      <Preview>
        {companyName} приглашает вас на собеседование — {positionTitle}
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            <Heading style={styles.brand}>Собес</Heading>
          </Section>

          {/* Card */}
          <Section style={styles.card}>
            <Heading as="h2" style={styles.title}>
              Новое приглашение на собеседование
            </Heading>
            <Text style={styles.text}>
              Привет, {candidateFirstName}!
            </Text>
            <Text style={styles.text}>
              Компания <strong>{companyName}</strong> приглашает вас на
              собеседование на позицию <strong>{positionTitle}</strong>.
            </Text>

            {proposedSlotAt && (
              <Section style={styles.slotBox}>
                <Text style={styles.slotLabel}>Предлагаемое время</Text>
                <Text style={styles.slotValue}>{formatDate(proposedSlotAt)}</Text>
              </Section>
            )}

            {!proposedSlotAt && (
              <Text style={{ ...styles.text, color: "#92400e" }}>
                ⚠️ Конкретное время ещё не подобрано — согласуем после вашего ответа.
              </Text>
            )}

            <Text style={styles.text}>
              Нажмите кнопку ниже, чтобы принять или отклонить приглашение.
            </Text>

            <Button href={dashboardUrl} style={styles.button}>
              Открыть кабинет
            </Button>

            <Hr style={styles.hr} />
            <Text style={styles.footer}>
              Если вы не ожидали этого письма — просто проигнорируйте его.
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
  header: {
    marginBottom: "16px",
  },
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
  slotBox: {
    backgroundColor: "#f4f4f5",
    borderRadius: "8px",
    border: "1px solid #e4e4e7",
    padding: "12px 16px",
    margin: "16px 0",
  },
  slotLabel: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#71717a",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    margin: 0,
  },
  slotValue: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#18181b",
    margin: "4px 0 0 0",
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
