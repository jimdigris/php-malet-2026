# SendMailForm — документация

Модуль отправки форм обратной связи с сайта через PHPMailer и AJAX.

---

## Структура проекта

```
/
├── index.html              — страница с формами
├── script.js               — JS-обработчик форм (класс SendMailForm)
├── script.php              — PHP-обработчик отправки (класс SendFormPhpMail)
├── style.css               — стили форм
└── PHPMailer_7_0_2/        — библиотека PHPMailer
    ├── PHPMailer.php        — главный класс: формирует письмо
    ├── SMTP.php             — SMTP-транспорт: отправляет команды серверу
    ├── Exception.php        — класс исключений для try/catch
    └── .htaccess            — запрет прямого доступа к папке (deny from all)
```

---

## Схема работы

```
Пользователь заполняет форму
        ↓
Нажимает кнопку "Отправить"
        ↓
JS (SendMailForm) — проверки:
    1. Заполнены ли обязательные поля (required)
    2. Honeypot — не заполнено ли скрытое поле
    3. Time trap — прошло ли достаточно времени с загрузки страницы
        ↓
AJAX POST → script.php
        ↓
PHP (SendFormPhpMail):
    1. Получает POST-данные и очищает их
    2. Формирует HTML-тело письма
    3. Отправляет через PHPMailer (SMTP)
    4. При ошибке — резервная отправка через mail()
    5. Возвращает JSON: {"result": "success"} или {"result": "error"}
        ↓
JS получает ответ → показывает сообщение пользователю
```

---

## HTML — index.html

### Структура формы

```html
<form class="form-phpmailer js-form-phpmailer"
      id="form-phpmailer--1"
      enctype="multipart/form-data"
      method="post"
      data-handler="script.php">
```

| Атрибут | Назначение |
|---|---|
| `class="form-phpmailer"` | CSS-стили |
| `class="js-form-phpmailer"` | JS находит формы по этому классу |
| `id="form-phpmailer--1"` | Уникальный идентификатор (нумерация с 1) |
| `enctype="multipart/form-data"` | Тип кодировки для передачи данных |
| `method="post"` | Метод отправки |
| `data-handler="script.php"` | Путь к PHP-обработчику. Каждая форма может иметь свой обработчик |

### Скрытые поля

```html
<input type="hidden" name="formName" value="Название формы">
<input type="hidden" name="formPageLink" value="#">
```

`formName` — название формы, попадает в заголовок письма.
`formPageLink` — ссылка на страницу, попадает в футер письма.

### Honeypot-поле (защита от ботов)

```html
<input type="text" name="phone_confirm" style="display:none" tabindex="-1" autocomplete="off">
```

Скрыто от пользователя. Бот заполняет его автоматически — JS это проверяет и останавливает отправку.

### Поля формы

```html
<input type="text"  name="name"     required>   <!-- имя, обязательное -->
<input type="tel"   name="phone"    pattern="[+0-9]*" required>   <!-- телефон, обязательное -->
<input type="email" name="email">               <!-- email, необязательное -->
<textarea           name="textarea">            <!-- сообщение, необязательное -->
```

### Блок результата

```html
<div class="form-phpmailer__result js-form-phpmailer__result">...</div>
```

По умолчанию скрыт (`display: none`). JS добавляет класс `active` и записывает текст ответа.

### Кнопка отправки

```html
<button type="submit"
        class="form-phpmailer__button form-phpmailer__button--send js-form-phpmailer__button--send">
    Отправить
</button>
```

`type="submit"` — браузер выполняет встроенную валидацию полей с `required`. JS перехватывает событие через `preventDefault()`.

### Чекбокс политики

```html
<input class="... js-form-phpmailer__politics--checkbox"
       id="form-phpmailer__politics-check--1"
       type="checkbox" name="policy" required>
<label class="... js-form-phpmailer__politics--label" for="..."></label>
<label class="... js-form-phpmailer__politics--text"  for="...">Текст</label>
```

Нативный чекбокс скрыт через CSS. Визуальный чекбокс нарисован через `label` с псевдоэлементом `::after`. JS управляет активностью кнопки в зависимости от состояния чекбокса.

---

## CSS — style.css

### Именование классов

Следует методологии BEM: `базовый-элемент__дочерний-элемент--модификатор`.

| Класс | Назначение |
|---|---|
| `.form-phpmailer` | Корневой блок формы |
| `.form-phpmailer__inputs` | Обёртка полей ввода |
| `.form-phpmailer__input` | Стиль каждого поля ввода и textarea |
| `.form-phpmailer__input:focus` | Состояние активного поля |
| `.form-phpmailer__result` | Блок сообщения о результате (скрыт по умолчанию) |
| `.form-phpmailer__result.active` | Видимое состояние блока результата |
| `.form-phpmailer__buttons` | Обёртка кнопки отправки |
| `.form-phpmailer__button` | Базовые стили кнопки |
| `.form-phpmailer__button--send` | Модификатор кнопки отправки |
| `.form-phpmailer__button--send:hover` | Состояние hover |
| `.form-phpmailer__button--send:disabled` | Неактивное состояние кнопки |
| `.form-phpmailer__politics` | Обёртка блока политики |
| `.form-phpmailer__politics--checkbox` | Скрытый нативный чекбокс |
| `.form-phpmailer__politics--label` | Визуальный чекбокс |
| `.form-phpmailer__politics--label::after` | Галочка при checked |
| `.form-phpmailer__politics--text` | Подпись чекбокса |
| `.js-form-phpmailer__input--error` | Подсветка незаполненного обязательного поля |

> Классы с префиксом `js-` используются только в JavaScript. Стили на них не вешаются, кроме `.js-form-phpmailer__input--error` — он специально предназначен для JS-управления состоянием ошибки.

---

## JS — script.js

### Класс SendMailForm

Единственный класс. Инициализируется один раз при загрузке страницы. Находит все формы на странице и навешивает обработчики на каждую независимо.

### Инициализация

```javascript
const data = [
    'js-form-phpmailer',                    // [0] класс формы
    'js-form-phpmailer__button--send',      // [1] класс кнопки отправить
    'js-form-phpmailer__politics--checkbox', // [2] класс чекбокса политики
    'js-form-phpmailer__politics--label',   // [3] класс декоративного label
    'js-form-phpmailer__politics--text',    // [4] класс подписи чекбокса
    'js-form-phpmailer__result',            // [5] класс блока результата
    'js-form-phpmailer__input--error',      // [6] класс подсветки ошибки
];

new SendMailForm(data);
```

Все классы передаются снаружи — класс не привязан к конкретным именам. При внедрении в другой проект достаточно поменять значения в массиве `data`.

### Приватные свойства

| Свойство | Тип | Назначение |
|---|---|---|
| `#classes` | object | Хранит все CSS-классы переданные через `data` |
| `#elements.forms` | array | Массив найденных DOM-элементов форм |
| `#formLoadTime` | number | Время загрузки страницы (для time trap защиты) |

### Методы

| Метод | Назначение |
|---|---|
| `#init()` | Точка входа. Вызывает все методы инициализации |
| `#getForms()` | Ищет все формы по классу. Возвращает `false` если не найдены |
| `#checkingPolicy()` | Управляет активностью кнопки в зависимости от чекбокса политики |
| `#checkingPhone()` | Фильтрует ввод в поле телефона — только цифры и `+` |
| `#listenerBtnSend()` | Вешает обработчик клика на кнопку каждой формы |
| `#clickBtnSend(e, form)` | Перехватывает отправку, запускает проверки, вызывает отправку |
| `#checkingRequired(form)` | Проверяет заполнены ли поля с `required`. Подсвечивает незаполненные |
| `#spamProtectionCheckHoneypot()` | Проверяет не заполнено ли скрытое honeypot-поле |
| `#spamProtectionCheckTimeTrap()` | Проверяет не слишком ли быстро отправлена форма (по умолчанию < 3 сек) |
| `#sendToPhp(form)` | Отправляет данные формы через AJAX POST. Обрабатывает ответ сервера |

### Порядок выполнения при нажатии кнопки

```
#clickBtnSend()
    → #checkingRequired()     — заполнены ли обязательные поля
    → #spamProtectionCheckHoneypot()  — не бот ли
    → #spamProtectionCheckTimeTrap()  — не слишком ли быстро
    → #sendToPhp()            — отправка на сервер
```

### AJAX-запрос

Данные отправляются методом `POST` на адрес из `data-handler` формы. Ответ ожидается в формате JSON.

Возможные ответы от сервера:

```json
{ "result": "success" }
{ "result": "error", "message": "текст ошибки" }
```

---

## PHP — script.php

### Защита от прямого доступа

```php
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(403);
    exit;
}
```

Файл принимает только POST-запросы. При прямом открытии в браузере возвращает 403.

### Класс SendFormPhpMail

#### Константы

| Константа | Назначение |
|---|---|
| `SMTP_DATA` | Данные SMTP-сервера: host, login, password, port, protection |
| `USERS_DATA` | Данные отправки: email отправителя, имя, список получателей, темы писем |

#### Свойства

| Свойство | Тип | Назначение |
|---|---|---|
| `$incomingFormData` | array | Входные данные из POST-запроса. Ключи совпадают с `name` полей формы |
| `$recipientMailBody` | string | HTML-тело письма для получателя |

#### Методы

| Метод | Назначение |
|---|---|
| `__construct()` | Запускает `init()` |
| `init()` | Точка входа. Последовательно вызывает все методы |
| `getPostData()` | Получает данные из `$_POST`, очищает через `htmlspecialchars` + `trim` |
| `createRecipientMailBody()` | Формирует HTML-письмо из полученных данных |
| `sendMail()` | Отправляет письмо через PHPMailer. Возвращает JSON-ответ |
| `reserveSendMail()` | Резервная отправка через встроенную функцию `mail()` при ошибке PHPMailer |

#### Порядок выполнения

```
__construct()
    → init()
        → getPostData()           — получить и очистить POST-данные
        → createRecipientMailBody() — сформировать HTML-письмо
        → sendMail()              — отправить письмо
            → при ошибке: reserveSendMail()
```

#### Очистка входных данных

```php
$this->incomingFormData[$key] = !empty($_POST[$key])
    ? htmlspecialchars(trim($_POST[$key]))
    : null;
```

`trim()` — убирает пробелы по краям. `htmlspecialchars()` — экранирует спецсимволы (`<`, `>`, `&`, `"`), защищая от XSS. Если поле пустое — сохраняется `null`.

#### HTML-шаблон письма

Письмо формируется как таблица. Поддержка таблиц в почтовых клиентах лучше чем flexbox. Выводятся только заполненные поля — пустые пропускаются через `array_filter`.

#### JSON-ответ

```php
echo json_encode(['result' => 'success']);                       // успех
echo json_encode(['result' => 'error', 'message' => '...']);    // ошибка
```

Перед ответом отправляется заголовок `Content-Type: application/json`.

---

## PHPMailer — библиотека

Версия 7.0.2. Установлена вручную (без Composer) — три файла в папке `PHPMailer_7_0_2/`.

| Файл | Назначение |
|---|---|
| `PHPMailer.php` | Главный класс. Формирует письмо: заголовки, тело, кодировка, вложения |
| `SMTP.php` | Низкоуровневое общение с SMTP-сервером. Команды EHLO, AUTH, DATA |
| `Exception.php` | Кастомный класс исключений. Нужен для `try/catch` |
| `.htaccess` | `deny from all` — запрещает прямой доступ к папке через браузер |

---

## Защита от спама

В проекте реализованы три уровня защиты:

### 1. Honeypot
Скрытое поле `phone_confirm` в HTML. Пользователь его не видит и не заполняет. Бот заполняет автоматически. JS проверяет — если поле не пустое, отправка останавливается.

### 2. Time trap
Фиксируется время загрузки страницы (`Date.now()`). При отправке проверяется сколько секунд прошло. Если меньше 3 секунд — считается ботом. Значение настраивается через параметр `minSeconds` метода `#spamProtectionCheckTimeTrap(minSeconds = 3)`.

### 3. Валидация required
JS проверяет все поля с атрибутом `required` перед отправкой. Незаполненные поля подсвечиваются красной рамкой. Дублирует встроенную браузерную валидацию для более гибкого управления поведением.

---

## Внедрение в другой проект

### Что скопировать

1. Папку `PHPMailer_7_0_2/` с `.htaccess`
2. Файл `script.php`
3. Файл `script.js`
4. Стили из `style.css` (блок между комментариями `/* формы отправки php-mailer - start/end */`)

### Что настроить в script.php

```php
private const SMTP_DATA = [
    'server'     => 'smtp.ваш-сервер.ru',
    'login'      => 'ваш-логин',
    'password'   => 'ваш-пароль',
    'port'       => 465,
    'protection' => 'ssl',
];

private const USERS_DATA = [
    'senderEmail'    => 'отправитель@домен.ru',
    'senderName'     => 'Название сайта',
    'recipientEmail' => ['получатель@домен.ru'],
    'recipientTheme' => 'Тема письма',
    'clientTheme'    => 'Тема письма для клиента',
];
```

### Что добавить в HTML

Скопировать шаблон формы из комментария в начале `script.js`. Изменить:

- `id="form-phpmailer--N"` — уникальный номер для каждой формы
- `data-handler="script.php"` — путь к обработчику
- `value` в скрытых полях `formName` и `formPageLink`
- `id` и `for` у чекбокса и label — должны совпадать и быть уникальными

### Подключить JS и CSS

```html
<link rel="stylesheet" href="style.css">
<script src="script.js"></script>
```

---

## Возможные доработки

- Отправка копии письма клиенту (использовать `$clientMailBody` и `clientTheme`)
- Добавление вложений через `$mail->addAttachment()`
- Логирование ошибок отправки в файл
- Добавление Google reCAPTCHA как третьего уровня защиты от спама
