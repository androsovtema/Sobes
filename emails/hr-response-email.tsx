import {
  Html, Head, Preview, Body, Container,
  Section, Heading, Text, Button, Hr,
} from "@react-email/components";

interface HrResponseEmailProps {
  candidateFirstName: string;
  candidateLastName: string;
  positionTitle: string;
  action: "accept" | "reject";
  scheduledAt: Date | null;
  interviewsUrl: string;
}

function formatDate(d: Date) {
  return d.toLocaleString("ru-RU", {
    weekday: "long", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow",
  });
}

export function HrResponseEmail({
  candidateFirstName,
  candidateLastName,
  positionTitle,
  action,
  scheduledAt,
  interviewsUrl,
}: HrResponseEmailProps) {
  const isAccepted = action === "accept";

  const previewText = isAccepted
    ? `${candidateFirstName} ${candidateLastName} принял приглашение на ${positionTitle}`
    : `${candidateFirstName} ${candidateLastName} отклонил приглашение на ${positionTitle}`;

  return (
    <Html lang="ru">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Heading style={styles.brand}>Собес</Heading>
          </Section>

          <Section style={styles.card}>
            <Text style={styles.emoji}>{isAccepted ? "✅" : "❌"}</Text>
            <Heading as="h2" style={styles.title}>
              {isAccepted
                ? "Кандидат принял приглашение"
                : "Кандидат отклонил приглашение"}
            </Heading>

            <Text style={styles.text}>
              <strong>
                {candidateFirstName} {candidateLastName}
              </strong>{" "}
              {isAccepted ? "принял(а)" : "отклонил(а)"} приглашение на позицию{" "}
              <strong>{positionTitle}</strong>.
            </Text>

            {isAccepted && scheduledAt && (
              <Section style={styles.detailsBox}>
                <Text style={styles.detailLabel}>Встреча назначена</Text>
                <Text style={styles.detailValue}>{formatDate(scheduledAt)}</Text>
                <Text style={{ ...styles.hint, marginTop: "8px" }}>
                  Не забудьте добавить ссылку на Яндекс Телемост в карточке встречи.
                </Text>
              </Section>
            )}

            {isAccepted && !scheduledAt && (
              <Section style={{ ...styles.detailsBox, backgroundColor: "#fffbeb", borderColor: "#fde68a" }}>
                <Text style={{ ...styles.detailLabel, color: "#92400e" }}>Внимание</Text>
                <Text style={{ ...styles.detailValue, color: "#92400e", fontSize: "14px" }}>
                  Кандидат принял, но общего слота не нашлось. Свяжитесь и согласуйте время вручную.
                </Text>
              </Section>
            )}

            <Button href={interviewsUrl} style={styles.button}>
              {isAccepted ? "Открыть встречи" : "Посмотреть других кандидатов"}
            </Button>

            <Hr style={styles.hr} />
            <Text style={styles.footer}>
              Это автоматическое уведомление от платформы Собес.
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
  hint: {
    fontSize: "12px",
    color: "#71717a",
    margin: 0,
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
