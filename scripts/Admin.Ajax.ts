/**
 * 이 파일은 아이모듈 관리자모듈의 일부입니다. (https://www.imodules.io)
 *
 * 관리자모듈에서 사용되는 비동기호출 클래스를 정의한다.
 *
 * @file /modules/admin/scripts/Admin.Ajax.ts
 * @author Arzz <arzz@arzz.com>
 * @license MIT License
 * @modified 2023. 3. 9.
 */
namespace Admin {
    export class Ajax {
        /**
         * GET 방식으로 데이터를 가져온다.
         *
         * @param {string} url - 요청주소
         * @param {Admin.Ajax.Params} params - 요청할 데이터
         * @param {number} retry - 재시도횟수
         * @return {Promise<Admin.Ajax.Results>} results - 요청결과
         */
        static async get(url: string, params: Admin.Ajax.Params = {}, retry: number = 0): Promise<Admin.Ajax.Results> {
            const language = Html.get('html').getAttr('lang');

            const queryString = new URLSearchParams(params).toString();
            if (queryString.length > 0) {
                if (url.indexOf('?') === -1) url += '?' + queryString;
                else url += '&' + queryString;
            }

            try {
                const response: Response = (await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept-Language': language,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json; charset=utf-8',
                    },
                    cache: 'no-store',
                    redirect: 'follow',
                }).catch((error) => {
                    if (retry < 3) {
                        return Admin.Ajax.get(url, params, ++retry);
                    } else {
                        Admin.Message.show({
                            icon: Admin.Message.ERROR,
                            title: Admin.printText('errors/TITLE'),
                            message: Admin.printText('errors/CONNECT_ERROR'),
                            buttons: Admin.Message.OK,
                        });

                        console.error(error);

                        return { success: false };
                    }
                })) as Response;

                const results: Admin.Ajax.Results = (await response.json()) as Admin.Ajax.Results;
                if (results.success == false && results.message !== undefined) {
                    Admin.Message.show({
                        icon: Admin.Message.ERROR,
                        title: Admin.printText('errors/TITLE'),
                        message: results.message,
                        buttons: Admin.Message.OK,
                    });
                }

                return results;
            } catch (e) {
                if (retry < 3) {
                    return Admin.Ajax.get(url, params, ++retry);
                } else {
                    Admin.Message.show({
                        icon: Admin.Message.ERROR,
                        title: Admin.printText('errors/TITLE'),
                        message: Admin.printText('errors/CONNECT_ERROR'),
                        buttons: Admin.Message.OK,
                    });

                    console.error(e);

                    return { success: false };
                }
            }
        }

        /**
         * POST 방식으로 데이터를 가져온다.
         * 전송할 데이터는 JSON 방식으로 전송된다.
         *
         * @param {string} url - 요청주소
         * @param {Admin.Ajax.Datas} datas - 전송할 데이터
         * @param {number} retry - 재시도횟수
         * @return {Promise<Admin.Ajax.Results>} results - 요청결과
         */
        static async post(url: string, datas: Admin.Ajax.Datas = {}, retry: number = 0): Promise<Admin.Ajax.Results> {
            const language = Html.get('html').getAttr('lang');

            try {
                const response: Response = (await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Accept-Language': language,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json; charset=utf-8',
                    },
                    body: JSON.stringify(datas),
                    cache: 'no-store',
                    redirect: 'follow',
                }).catch((error) => {
                    if (retry < 3) {
                        return Admin.Ajax.post(url, datas, ++retry);
                    } else {
                        Admin.Message.show({
                            icon: Admin.Message.ERROR,
                            title: Admin.printText('errors/TITLE'),
                            message: Admin.printText('errors/CONNECT_ERROR'),
                            buttons: Admin.Message.OK,
                        });

                        console.error(error);

                        return { success: false };
                    }
                })) as Response;

                const results: Admin.Ajax.Results = (await response.json()) as Admin.Ajax.Results;
                if (results.success == false && results.message !== undefined) {
                    Admin.Message.show({
                        icon: Admin.Message.ERROR,
                        title: Admin.printText('errors/TITLE'),
                        message: results.message,
                        buttons: Admin.Message.OK,
                    });
                }

                return results;
            } catch (e) {
                if (retry < 3) {
                    return Admin.Ajax.post(url, datas, ++retry);
                } else {
                    Admin.Message.show({
                        icon: Admin.Message.ERROR,
                        title: Admin.printText('errors/TITLE'),
                        message: Admin.printText('errors/CONNECT_ERROR'),
                        buttons: Admin.Message.OK,
                    });

                    console.error(e);

                    return { success: false };
                }
            }
        }
    }

    export namespace Ajax {
        export interface Params {
            [key: string]: string;
        }

        export interface Datas {
            [key: string]: any;
        }

        export interface Results {
            success: boolean;
            message?: string;
            total?: number;
            records?: any[];
            data?: Object;
            [key: string]: any;
        }
    }
}
