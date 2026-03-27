"use strict";

/* 
    Назначение: 
    для работы отправки сообщений с форм обратной связи.
    для передачи данных в php обработчик

    Образец html:
    <form class="form-phpmailer js-form-phpmailer" id="form-phpmailer--1" enctype="multipart/form-data" method="post" data-handler="send.php">
        <div class="form-phpmailer__inputs">
            <input type="hidden" name="formName" value="Название формы">
            <input type="hidden" name="formPageLink" value="#">
            <input type="text" name="phone_confirm" style="display:none" tabindex="-1" autocomplete="off">

            <input class="form-phpmailer__input" type="text" name="name" placeholder="Ваше имя" required>
            <input class="form-phpmailer__input" type="tel" name="phone" placeholder="Телефон" pattern="[+0-9]*" required>
            <input class="form-phpmailer__input" type="email" name="email" placeholder="Ваш email">
            <textarea class="form-phpmailer__input" name="textarea" placeholder="Сообщение"></textarea>
        </div>

        <div class="form-phpmailer__result js-form-phpmailer__result">Результат об удачной или нет отправки</div>

        <div class="form-phpmailer__buttons">
            <button type="submit" class="form-phpmailer__button form-phpmailer__button--send js-form-phpmailer__button--send">Отправить</button>
        </div>

        <div class="form-phpmailer__politics">
            <input class="form-phpmailer__politics--checkbox js-form-phpmailer__politics--checkbox" id="form-phpmailer__politics-check--1" type="checkbox" name="policy" required>
            <label class="form-phpmailer__politics--label js-form-phpmailer__politics--label" for="form-phpmailer__politics-check--1"></label>
            <label class="form-phpmailer__politics--text js-form-phpmailer__politics--text" for="form-phpmailer__politics-check--1"> Я согласен на обработку моих персональных данных *</label>
        </div>
    </form>
*/


class SendMailForm {

    #classes = {                                                                                        // классы
        form: '',                                                                                       // форма
        btnSend: '',                                                                                    // кн Отправить

        politicsCheckbox: '',                                                                           // политика - базовый input (скрытый)
        politicsLabel: '',                                                                              // политика - декоративный label-inut
        politicsText: '',                                                                               // политика - подпись input

        result: '',                                                                                     // поле с результатом отправки
        inputError: '',                                                                                 // подсветка поля с ошибкой
    };

    #elements = {                                                                                       // элементы
        forms: [],                                                                                      // формы
    }

    #formLoadTime = Date.now();                                                                         // ? для спам защиты - время загрузки страницы (для всех форм) - не обязательно

    constructor(data) {
        this.#classes.form = data[0];                                                                   // получим класс формы
        this.#classes.btnSend = data[1];                                                                // получим класс кнопки Отправить

        this.#classes.politicsCheckbox = data[2];                                                       // получим класс политики - базового input (скрытый)
        this.#classes.politicsLabel = data[3];                                                          // получим класс политики - декоративного label-inut
        this.#classes.politicsText = data[4];                                                           // получим класс политики - подписи input

        this.#classes.result = data[5];                                                                 // получим класс поля с результатом отправки
        this.#classes.inputError = data[6];                                                             // получим класс для подсветки поля с ошибкой

        this.#init();                                                                                   // * 1 - запуск
    }

    #init() {                                                                                           // ! запуск                                                                            
        if (!this.#getForms()) return;                                                                  // * 2 - найти все формы и закончим, если нет форм

        this.#checkingPolicy();                                                                         // ? проверка политики (нажат ли чекбокс) - не обязательно
        this.#checkingPhone();                                                                          // ? ограничение ввода в поле телефона - не обязательно

        this.#listenerBtnSend();                                                                        // * 3 - отслеживание нажатия на кн отправить в каждой форме
    };

    #getForms() {                                                                                       // ! найти все формы
        this.#elements.forms = Array.from(document.querySelectorAll(`.${this.#classes.form}`));
        if (!this.#elements.forms?.length) return false;                                                // если не найдены
        return true;                                                                                    // если найдены
    };

    #checkingPolicy() {                                                                                 // ! проверка политики (нажат ли чекбокс)
        this.#elements.forms.forEach((form) => {                                                        // перебираем формы

            const checkbox = form.querySelector(`.${this.#classes.politicsCheckbox}`);                  // чекбокс политики
            const label = form.querySelector(`.${this.#classes.politicsLabel}`);                        // декоративный label
            const text = form.querySelector(`.${this.#classes.politicsText}`);                          // подпись
            const btnSend = form.querySelector(`.${this.#classes.btnSend}`);                            // кнопка отправить

            if (!checkbox || !label || !text || !btnSend) return;                                       // если нет нужных элементов - пропускаем форму

            btnSend.disabled = !checkbox.checked;                                                       // начальное состояние кнопки

            const handler = () => {                                                                     // обработчик клика
                setTimeout(() => {
                    btnSend.disabled = !checkbox.checked;                                               // активируем/деактивируем кнопку
                }, 0);
            };

            label.addEventListener('click', handler);                                                   // вешаем обработчик на label
            text.addEventListener('click', handler);                                                    // вешаем обработчик на text
        });
    };

    #checkingPhone() {                                                                                  // ! ограничение ввода в поле телефона
        this.#elements.forms.forEach((form) => {                                                        // перебираем формы

            const phone = form.querySelector(`input[type="tel"]`);                                      // поле телефона
            if (!phone) return;                                                                         // если нет поля - пропускаем форму

            phone.addEventListener('input', () => {                                                     // вешаем обработчик на ввод
                phone.value = phone.value.replace(/[^+\d]/g, '');                                       // оставляем только + и цифры
            });
        });
    };

    #spamProtectionCheckHoneypot() {                                                                    // ! защита от спама - скрытое поле
        return this.#elements.forms.some((form) => {                                                    // перебираем формы
            const honeypot = form.querySelector('input[name="phone_confirm"]');                         // найти скрытое поле
            if (!honeypot) return false;                                                                // если поля нет - пропускаем
            return honeypot.value.trim() !== '';                                                        // если есть и заполнено - спам
        });
    };

    #spamProtectionCheckTimeTrap(minSeconds = 3) {                                                      // ! защита от спама - проверка времени
        const timeSpent = (Date.now() - this.#formLoadTime) / 1000;                                     // сколько секунд прошло с загрузки
        return timeSpent < minSeconds;                                                                  // true если слишком быстро - спам
    };

    #listenerBtnSend() {                                                                                // ! отслеживание нажатия на кнопку отправить
        this.#elements.forms.forEach((form) => {                                                        // перебираем формы

            const btnSend = form.querySelector(`.${this.#classes.btnSend}`);                            // кнопка отправить
            if (!btnSend) return;                                                                       // если нет кнопки - пропускаем форму

            btnSend.addEventListener('click', (e) => {                                                  // вешаем обработчик на кнопку
                this.#clickBtnSend(e, form);                                                            // вызываем метод обработки нажатия
            });
        });
    };

    #clickBtnSend(e, form) {                                                                            // ! обработка нажатия на кнопку отправить
        e.preventDefault();                                                                             // отменяем стандартное поведение формы

        if (!this.#checkingRequired(form)) return;                                                      // ? проверка обязательных полей (c required) - не обязательно
        if (this.#spamProtectionCheckHoneypot()) return;                                                // ? защита от спама - скрытое поле - не обязательно
        if (this.#spamProtectionCheckTimeTrap()) return;                                                // ? защита от спама - защита от спама - проверка времени - не обязательно

        this.#sendToPhp(form);                                                                          // * 4 - отправить форму в php обработчик
    };

    #checkingRequired(form) {                                                                           // ! проверка обязательных полей
        const requiredFields = Array.from(form.querySelectorAll('[required]'));                         // найти все обязательные поля
        let isValid = true;                                                                             // флаг валидности

        requiredFields.forEach((field) => {                                                             // перебираем обязательные поля
            if (!field.value.trim()) {                                                                  // если поле пустое
                field.classList.add(this.#classes.inputError);                                          // подсветить поле
                isValid = false;                                                                        // форма не валидна
            } else {                                                                                    // если поле заполнено
                field.classList.remove(this.#classes.inputError);                                       // убрать подсветку
            }
        });

        if (!isValid) {                                                                                 // если есть незаполненные поля
            const result = form.querySelector(`.${this.#classes.result}`);                              // блок результата
            if (result) { result.classList.add('active'); result.textContent = 'Заполните обязательные поля'; }  // показать сообщение
        }

        return isValid;                                                                                 // вернуть результат
    };

    #sendToPhp(form) {                                                                                  // ! отправить форму в php обработчик
        const handler = form.dataset.handler;                                                           // получить путь к php обработчику из data-handler
        if (!handler) return;                                                                           // если нет пути - прекращаем

        const result = form.querySelector(`.${this.#classes.result}`);                                  // блок результата
        const btnSend = form.querySelector(`.${this.#classes.btnSend}`);                                // кнопка отправить
        const req = new XMLHttpRequest();                                                               // создать новый AJAX-объект

        req.open('POST', handler, true);                                                                // открыть соединение: метод POST, адрес PHP-файла, асинхронно

        req.onload = () => {                                                                            // обработка ответа от сервера
            if (btnSend) btnSend.disabled = false;                                                      // разблокировать кнопку после ответа

            if (req.status >= 200 && req.status < 400) {                                                // если сервер вернул успешный код
                let json = null;                                                                        // переменная для JSON-ответа

                try { json = JSON.parse(req.response); }                                                // парсим ответ
                catch (e) {                                                                             // если ошибка парсинга
                    if (result) { result.classList.add('active'); result.textContent = 'Ошибка обработки ответа сервера'; }                             // показать сообщение
                    return;                                                                                                                             // прервать выполнение
                }

                if (json.result === 'success') {                                                                                                        // если успешно
                    if (result) { result.classList.add('active'); result.textContent = 'Сообщение отправлено'; }                                        // показать сообщение об успехе
                    form.reset();                                                                                                                       // очистить форму
                    if (btnSend) btnSend.disabled = true;                                                                                               // заблокировать кнопку после сброса формы
                } else {                                                                                                                                // если ошибка
                    if (result) { result.classList.add('active'); result.textContent = 'Сообщение не отправлено. Свяжитесь с нами другим способом'; }   // показать сообщение об ошибке
                }

            } else {                                                                                                                                        // если сервер вернул ошибку
                if (result) { result.classList.add('active'); result.textContent = 'Сообщение не отправлено. Ошибка. Свяжитесь с нами другим способом'; }   // показать сообщение об ошибке
            }
        };

        req.onerror = () => {                                                                                                   // если запрос не дошёл до сервера
            if (btnSend) btnSend.disabled = false;                                                                              // разблокировать кнопку при ошибке
            if (result) { result.classList.add('active'); result.textContent = 'Ошибка отправки запроса'; }                     // показать сообщение об ошибке
        };

        if (btnSend) btnSend.disabled = true;                                                           // заблокировать кнопку на время отправки
        req.send(new FormData(form));                                                                   // отправить данные формы
    };
};

const data = [
    'js-form-phpmailer',                                                                                // класс формы
    'js-form-phpmailer__button--send',                                                                  // класс кн Отправить
    'js-form-phpmailer__politics--checkbox',                                                            // класс политики - базового input (скрытый)
    'js-form-phpmailer__politics--label',                                                               // класс политики - декоративного label-inut
    'js-form-phpmailer__politics--text',                                                                // класс политики - подписи input
    'js-form-phpmailer__result',                                                                        // класс поля с результатом отправки
    'js-form-phpmailer__input--error',                                                                  // класс для подсветки поля с ошибкой
];


new SendMailForm(data);