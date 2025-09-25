import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";

export default function ResetPassword() {
  return (
    <Section className="py-10">
      <Card className="p-6 max-w-md space-y-4">
        <h1 className="text-xl font-bold">Сброс пароля</h1>
        <p className="text-sm text-[var(--text-dim)]">
          Автоматический сброс пароля временно недоступен. Пожалуйста, свяжитесь с администратором или создайте новый
          аккаунт, чтобы получить доступ.
        </p>
      </Card>
    </Section>
  );
}

