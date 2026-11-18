# sistema-super-legal

Sistema de Agendamentos CEPK para escola.

## Funcionalidades

- Fluxo em três telas: 1) login, 2) agendamento, 3) resultado dos agendamentos

- Cadastro de reservas de laboratório (avulsas)
- Duração configurável em aulas (1 a 6 aulas, de 45 minutos cada)
- Reservas nos turnos da manhã (07:20 às 12:35) e da tarde (13:00 às 18:15), com filtro por turno
- Aulas de 50 minutos e recreio de 15 minutos após a 3ª aula
- Turno da tarde: 6º ao 9º ano com 5 aulas (até 17:25); 1º ano técnico com 6 aulas (até 18:15)
- Série e turma por turno: manhã (1º ao 3º ano do Ensino Médio) e tarde (6º ao 9º ano; 1º ano técnico em Desenvolvimento de Sistemas e Administração)
- Identificação do professor e da matéria em cada reserva
- Calendário semanal com navegação, atalho “Hoje” e indicador de dias já agendados
- Edição e cancelamento restritos ao professor que criou a reserva
- Um professor pode registrar quantas reservas quiser no mesmo dia
- Bloqueio automático de conflitos de horário

## Tecnologias

- React
- Vite

## Como executar

```bash
npm install
npm run dev
```
