/**
 * 이 파일은 Aui 라이브러리의 일부입니다. (https://www.imodules.io)
 *
 * 메시지창 클래스를 정의한다.
 *
 * @file /scripts/Aui.Message.ts
 * @author Arzz <arzz@arzz.com>
 * @license MIT License
 * @modified 2024. 3. 1.
 */
namespace Aui {
    export namespace Message {
        export namespace Show {
            export interface Properties extends Aui.Component.Properties {
                /**
                 * @type {Aui.Title|string} title - 메시지창 제목
                 */
                title?: Aui.Title | string;

                /**
                 * @type {Dom} icon - 메시지창 아이콘 DOM 요소
                 */
                icon?: Dom;

                /**
                 * @type {string} message - 메시지
                 */
                message?: string;

                /**
                 * @type {string} messageClass - 메시지박스 스타일시트 클래스
                 */
                messageClass?: string;

                /**
                 * @type {Object} buttons - 버튼
                 */
                buttons?: Aui.Button.Properties[];

                /**
                 * @type {Function} handler - 메시지창 버튼 핸들러
                 */
                handler?: (button: Aui.Button) => void;
            }
        }

        export namespace Loading {
            export interface Properties extends Aui.Component.Properties {
                /**
                 * @type {Aui.Title|string} title - 메시지창 제목
                 */
                title?: Aui.Title | string;

                /**
                 * @type {string} message - 메시지
                 */
                message?: string;

                /**
                 * @type {Aui.Loading.Type} type - 로딩타입
                 */
                type?: Aui.Loading.Type;
            }
        }

        export namespace Progress {
            export interface Properties extends Aui.Component.Properties {
                /**
                 * @type {Aui.Title|string} title - 메시지창 제목
                 */
                title?: Aui.Title | string;

                /**
                 * @type {string} message - 메시지
                 */
                message?: string;

                /**
                 * @type {string} method - 프로그래스바를 호출할 메소드
                 */
                method?: 'GET' | 'POST' | 'DELETE';

                /**
                 * @type {string} url - 프로그래스바를 호출할 URL
                 */
                url: string;

                /**
                 * @type {Ajax.Params} url - 프로그래스바를 호출할 URL 매개변수
                 */
                params?: Ajax.Params;

                /**
                 * @type {Ajax.Data} url - 프로그래스바를 호출할 데이터
                 */
                data?: Ajax.Data;

                /**
                 * @type {Function} handler - 삭제완료 후 실행할 핸들러
                 */
                progress: (progress: Aui.Progress, results: Ajax.Progress.Results) => void;

                /**
                 * @type {Function} handler - 삭제완료 후 실행할 핸들러
                 */
                handler?: (button: Aui.Button, results: Ajax.Results) => Promise<void>;
            }
        }

        export namespace Delete {
            export interface Properties extends Aui.Component.Properties {
                /**
                 * @type {Aui.Title|string} title - 메시지창 제목
                 */
                title?: Aui.Title | string;

                /**
                 * @type {string} message - 메시지
                 */
                message?: string;

                /**
                 * @type {string} url - 삭제를 처리할 프로세스 URL
                 */
                url?: string;

                /**
                 * @type {Ajax.Params} url - 삭제를 처리할 프로세스 URL 매개변수
                 */
                params?: Ajax.Params;

                /**
                 * @type {Function} handler - 삭제완료 후 실행할 핸들러
                 */
                handler?: (results: Ajax.Results) => Promise<void>;
            }
        }
    }

    export class Message {
        static message: Aui.Window = null;

        static INFO = Html.create('i').addClass('info');
        static ERROR = Html.create('i').addClass('error');
        static CONFIRM = Html.create('i').addClass('confirm');
        static LOADING = Html.create('i').addClass('loading').html('<i></i><i></i><i></i><i></i>');
        static OK = [{ action: 'ok', text: '@buttons.ok', buttonClass: 'confirm' }];
        static DANGER = [{ action: 'ok', text: '@buttons.ok', buttonClass: 'danger' }];
        static OKCANCEL = [
            { action: 'cancel', text: '@buttons.cancel' },
            { action: 'ok', text: '@buttons.ok', buttonClass: 'confirm' },
        ];
        static DANGERCANCEL = [
            { action: 'cancel', text: '@buttons.cancel' },
            { action: 'ok', text: '@buttons.ok', buttonClass: 'danger' },
        ];

        /**
         * 메시지창을 연다.
         *
         * @param {Aui.Message.Show.Properties} properties - 설정
         */
        static show(properties: Aui.Message.Show.Properties = null): void {
            Aui.Message.close();

            const buttons: Aui.Button[] = [];
            const handler =
                properties?.handler ??
                (() => {
                    Aui.Message.close();
                });
            properties?.buttons?.forEach((button: Aui.Button.Properties) => {
                buttons.push(
                    new Aui.Button({
                        ...button,
                        text: button.text.indexOf('@') === 0 ? Aui.printText(button.text.substring(1)) : button.text,
                        handler: handler,
                    })
                );
            });

            Aui.Message.message = new Aui.Window({
                title: properties?.title ?? '',
                modal: true,
                movable: false,
                resizable: false,
                closable: properties.closable ?? false,
                buttons: buttons,
                listeners: {
                    show: (window: Aui.Window) => {
                        window.$getComponent().setAttr('data-role', 'message');
                    },
                },
            });
            Aui.Message.message.addEvent('close', () => {
                Aui.Message.message = null;
            });

            const $content = Aui.Message.message.$getContent();
            const $messagebox = Html.create('div', { 'data-role': 'messagebox' });
            if (properties?.messageClass) {
                $messagebox.addClass(...properties.messageClass.split(' '));
            }

            if (properties?.icon instanceof Dom) {
                const $icon = Html.create('div', { 'data-role': 'icon' });
                $icon.append(properties?.icon);
                $messagebox.append($icon);
            }

            const $message = Html.create('div', { 'data-role': 'message' });
            $message.html('<div>' + (properties.message ?? '') + '</div>');
            $messagebox.append($message);
            $content.append($messagebox);

            Aui.Message.message.show();
        }

        /**
         * 로딩메시지를 연다.
         *
         * @param {Aui.Message.Loading.Properties} properties - 로딩설정
         */
        static loading(properties: Aui.Message.Loading.Properties = null): void {
            Aui.Message.close();

            Aui.Message.message = new Aui.Window({
                title: properties?.title ?? Aui.printText('actions.loading_status'),
                modal: true,
                movable: false,
                resizable: false,
                closable: false,
                width: 300,
                listeners: {
                    show: (window: Aui.Window) => {
                        window.$getComponent().setAttr('data-role', 'message');
                        window.setData(
                            'loading',
                            new Aui.Loading(window, {
                                type: properties?.type ?? 'dot',
                                modal: false,
                                text: properties?.message ?? Aui.printText('actions.loading'),
                            })
                        );
                        window.getData('loading')?.show();
                    },
                    close: (window: Aui.Window) => {
                        window.getData('loading')?.close();
                    },
                },
            });

            Aui.Message.message.show();
        }

        /**
         * 로딩메시지를 연다.
         *
         * @param {Aui.Message.Progress.Properties} properties - 로딩설정
         */
        static progress(properties: Aui.Message.Progress.Properties = null): void {
            const progress: Ajax.Progress = Ajax.Progress.init();

            Aui.Message.close();

            Aui.Message.message = new Aui.Window({
                title: properties?.title ?? Aui.printText('actions.progress_status'),
                modal: true,
                movable: false,
                resizable: false,
                closable: false,
                scrollable: false,
                width: 400,
                padding: 10,
                items: [
                    new Aui.Progress({
                        message: properties?.message ?? null,
                        loading: true,
                    }),
                ],
                buttons: [
                    new Aui.Button({
                        text: Aui.printText('buttons.cancel'),
                        handler: () => {
                            progress.abort();
                            Aui.Message.close();
                        },
                    }),
                    new Aui.Button({
                        text: Aui.printText('buttons.ok'),
                        buttonClass: 'confirm',
                        handler: async (button) => {
                            if (typeof properties?.handler == 'function') {
                                await properties.handler(button, button.value);
                            }
                            Aui.Message.close();
                        },
                    }),
                ],
                listeners: {
                    show: async (window) => {
                        const button = window.buttons.at(1) as Aui.Button;
                        button.setLoading(true);
                        const method = (properties.method ?? 'GET').toUpperCase();
                        const url = properties.url;
                        const params = (properties.params ?? null) as Ajax.Params;
                        const data = properties.data ?? null;

                        const callback = (results: Ajax.Progress.Results) => {
                            if (Aui.getComponent(window.getId()) === null) {
                                return;
                            }

                            const progress = window.getItemAt(0) as Aui.Progress;
                            progress.setMax(results.total);
                            progress.setValue(results.current);

                            if (typeof properties.progress == 'function') {
                                if (results.success == true) {
                                    properties.progress(progress, results);
                                }
                            }

                            if (results.end == true) {
                                if (results.success == true) {
                                    button.setValue(results);
                                    button.setLoading(false);
                                    window.setTitle(Aui.printText('actions.complete_status'));
                                } else {
                                    Aui.Message.show({
                                        title: Aui.getErrorText('TITLE'),
                                        message: results?.message ?? Aui.getErrorText('CONNECT_ERROR'),
                                        icon: Aui.Message.ERROR,
                                        buttons: Aui.Message.OK,
                                        handler: async (button) => {
                                            if (typeof properties?.handler == 'function') {
                                                await properties.handler(button, results);
                                            }
                                            Aui.Message.close();
                                        },
                                    });
                                }
                            }
                        };

                        const progress = Ajax.Progress.init();
                        await iModules.sleep(2000);
                        switch (method) {
                            case 'POST':
                                progress.post(url, data, params, callback);
                                break;

                            case 'DELETE':
                                progress.delete(url, params, callback);
                                break;

                            default:
                                progress.get(url, params, callback);
                        }
                    },
                },
            });

            Aui.Message.message.show();
        }

        /**
         * 삭제를 위한 메시지창을 연다.
         *
         * @param {Aui.Message.Delete.Properties} properties - 로딩설정
         */
        static delete(properties: Aui.Message.Delete.Properties = null): void {
            Aui.Message.show({
                title: properties?.title ?? Aui.getErrorText('CONFIRM'),
                icon: Aui.Message.CONFIRM,
                message: properties?.message ?? Aui.printText('actions.delete'),
                buttons: Aui.Message.DANGERCANCEL,
                handler: async (button) => {
                    if (button.action == 'ok') {
                        (button.getParent() as Aui.Window).buttons.at(0).hide();
                        button.setLoading(true);

                        if (properties?.url !== null) {
                            const results = await Ajax.delete(properties.url, properties.params ?? null);

                            if (results.success == true) {
                                Aui.Message.show({
                                    title: Aui.getErrorText('INFO'),
                                    icon: Aui.Message.INFO,
                                    message: Aui.printText('actions.deleted'),
                                    buttons: Aui.Message.OK,
                                    handler: async () => {
                                        if (typeof properties?.handler == 'function') {
                                            await properties.handler(results);
                                        }
                                        Aui.Message.close();
                                    },
                                });
                            } else if (Aui.getComponent(button.getParent().getId()) !== null) {
                                (button.getParent() as Aui.Window).buttons.at(0).show();
                                button.setLoading(false);
                            }
                        } else {
                            Aui.Message.show({
                                title: Aui.getErrorText('INFO'),
                                message: Aui.printText('actions.deleted'),
                                icon: Aui.Message.INFO,
                                buttons: Aui.Message.OK,
                                handler: async () => {
                                    if (typeof properties?.handler == 'function') {
                                        await properties.handler(null);
                                    }
                                    Aui.Message.close();
                                },
                            });
                        }
                    } else {
                        Aui.Message.close();
                    }
                },
            });
        }

        /**
         * 메시지창을 닫는다.
         */
        static close(): void {
            if (Aui.Message.message !== null) {
                Aui.Message.message.close();
            }
        }
    }
}
