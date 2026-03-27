<?php

declare(strict_types=1);

/* 
    Назначение: 
    для работы отправки сообщений с форм обратной связи.
    для получения данных из js (класс SendMailForm)
*/

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {                                                // проверка-защита от прямого запроса
    http_response_code(403);
    exit;
}
require_once 'PHPMailer_7_0_2/PHPMailer.php';                                               // главный класс, формирует письмо: заголовки, тело, вложения, кодировка
require_once 'PHPMailer_7_0_2/SMTP.php';                                                    // устанавливает соединение, отправляет команды
require_once 'PHPMailer_7_0_2/Exception.php';                                               // кастомный класс исключений. Нужен для обработки ошибок через try/catch

class SendFormPhpMail
{
    private const SMTP_DATA = [                                                             // данные почтового сервера 
        'server' => 'smtp.yandex.ru',                                                       // адрес smtp
        'login' => 'my-ligin',                                                              // логин
        'password' => 'my-password',                                                        // пароль
        'port' => 123,                                                                      // порт
        'protection' => 'ssl',                                                              // защита
    ];

    private const USERS_DATA = [                                                            // данные для отправки
        'senderEmail' => 'mail@mail.ru',                                                    // почта отправителя (сайта\ресурса)
        'senderName' => 'Имя сайта',                                                        // имя отправителя (сайта\ресурса)

        'recipientEmail' => ['mail@mail.ru'],                                               // почты получателей (для нас)
        'recipientTheme' => 'Сообщение с сайта ...',                                        // тема письма для получателей (для нас)

        'clientTheme' => 'Вы оставили запрос на сайте ...',                                 // тема письма для клиента (отправителя формы на сайте\ресурсе)
    ];

    private array $incomingFormData = [                                                     // входные данные из формы
        'name' => null,                                                                     // имя
        'phone' => null,                                                                    // телефон
        'email' => null,                                                                    // почта
        'textarea' => null,                                                                 // сообщение
        'formName' => null,                                                                 // название формы
        'formPageLink' => null,                                                             // ссылка на страницу с формой
    ];

    //private string $clientMailBody = '';                                                    // тело письма для клиента
    private string $recipientMailBody = '';                                                 // тело письма для получателя (для нас)

    public function __construct()
    {
        $this->init();                                                                      // * 1 - запуск
    }

    private function init(): void                                                           // ! запуск
    {
        $this->getPostData();                                                               // * 2 - получить входящие данные
        $this->createRecipientMailBody();                                                   // * 3 - создать тело письма для получателя (для нас)

        $this->sendMail();                                                                  // * 4 - отправить письмо
    }

    private function getPostData(): void                                                    // ! получить входящие данные
    {
        foreach ($this->incomingFormData as $key => $value) {                               // перебираем поля формы
            $this->incomingFormData[$key] = !empty($_POST[$key])                            // если поле не пустое
                ? htmlspecialchars(trim($_POST[$key]))                                      // очищаем от лишних символов и сохраняем
                : null;                                                                     // иначе null
        }
    }

    private function createRecipientMailBody(): void                                        // ! создать тело письма для получателя (для нас)
    {
        $fields = [                                                                                                                         // поля письма
            'Имя'        => ['value' => $this->incomingFormData['name'],     'color' => '#222', 'weight' => '500'],
            'Телефон'    => ['value' => $this->incomingFormData['phone'],    'color' => '#222', 'weight' => '500'],
            'Email'      => ['value' => $this->incomingFormData['email'],    'color' => '#dd3f45', 'weight' => '500'],
            'Сообщение'  => ['value' => $this->incomingFormData['textarea'], 'color' => '#222', 'weight' => '400'],
        ];

        $rows = '';                                                                                                                         // строки письма
        foreach ($fields as $label => $field) {                                                                                             // перебираем поля
            if (!$field['value']) continue;                                                                                                 // пропускаем пустые
            $rows .= "
            <tr>
                <td style='width:100px; font-size:12px; color:#888; padding:8px 12px; vertical-align:top; border-bottom:1px solid #f0f0f0;'>{$label}</td>
                <td style='font-size:14px; color:{$field['color']}; font-weight:{$field['weight']}; padding:8px 12px; vertical-align:top; border-bottom:1px solid #f0f0f0;'>{$field['value']}</td>
            </tr>";
        }

        $formName     = $this->incomingFormData['formName'] ?? '';                                                                          // название формы
        $formPageLink = $this->incomingFormData['formPageLink'] ?? '#';                                                                     // ссылка на страницу

        $this->recipientMailBody = "
        <div style='width:98%; margin:0 auto; font-family:Arial, sans-serif; font-size:14px; border-radius:8px; overflow:hidden; border:1px solid #e0e0e0;'>
            <div style='background:linear-gradient(135deg, #dd3f45, #484b53); padding:20px 24px;'>
                <div style='font-size:11px; color:rgba(255,255,255,0.7); text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;'>Новое сообщение с сайта</div>
                <div style='font-weight:500; font-size:20px; color:#fff;'>{$formName}</div>
            </div>
            <div style='padding:12px; background:#ffffff;'>
                <table style='width:100%; border-collapse:collapse;'>
                    {$rows}
                </table>
            </div>
            <div style='background:#f7f7f7; padding:12px 24px; border-top:1px solid #e0e0e0; font-size:12px; color:#888;'>
                Страница запроса: <a href='{$formPageLink}' style='color:#dd3f45; text-decoration:none; font-weight:500;'>{$formPageLink}</a>
            </div>
        </div>";
    }

    private function sendMail(): void                                                           // ! отправить письмо
    {
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);                                        // создать объект PHPMailer (true - включить исключения)

        try {
            header('Content-Type: application/json');

            $mail->isSMTP();                                                                    // использовать SMTP
            $mail->CharSet    = 'UTF-8';                                                        // кодировка
            $mail->SMTPAuth   = true;                                                           // авторизация на сервере
            $mail->Host       = self::SMTP_DATA['server'];                                      // адрес smtp сервера
            $mail->Username   = self::SMTP_DATA['login'];                                       // логин
            $mail->Password   = self::SMTP_DATA['password'];                                    // пароль
            $mail->SMTPSecure = self::SMTP_DATA['protection'];                                  // защита
            $mail->Port       = self::SMTP_DATA['port'];                                        // порт

            $mail->setFrom(self::USERS_DATA['senderEmail'], self::USERS_DATA['senderName']);    // отправитель

            foreach (self::USERS_DATA['recipientEmail'] as $email) {                            // перебираем получателей
                $mail->addAddress($email);                                                      // добавить получателя
            }

            $mail->isHTML(true);                                                                // формат письма HTML
            $mail->Subject = self::USERS_DATA['recipientTheme'];                                // тема письма
            $mail->Body    = $this->recipientMailBody;                                          // тело письма

            $mail->send();                                                                      // отправить письмо

            echo json_encode(['result' => 'success']);                                          // вернуть успех

        } catch (\Exception $e) {                                                               // если ошибка
            echo json_encode(['result' => 'error', 'message' => $e->getMessage()]);             // вернуть ошибку

            $this->reserveSendMail();                                                           // * резервная отправка письма
        }
    }

    private function reserveSendMail(): void                                                    // ! резервная отправка письма
    {
        $message = "Имя: {$this->incomingFormData['name']} \n"                                  // имя
            . "Телефон: {$this->incomingFormData['phone']} \n"                                  // телефон
            . "Почта: {$this->incomingFormData['email']} \n"                                    // почта
            . "Сообщение: {$this->incomingFormData['textarea']}";                               // сообщение

        foreach (self::USERS_DATA['recipientEmail'] as $email) {                                // перебираем получателей
            mail($email, 'Сообщение с сайта', $message);                                        // отправить письмо
        }
    }
}

new SendFormPhpMail();
