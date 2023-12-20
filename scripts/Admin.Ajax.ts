/**
 * 이 파일은 아이모듈 관리자모듈의 일부입니다. (https://www.imodules.io)
 *
 * 관리자모듈에서 사용되는 비동기호출 클래스를 정의한다.
 *
 * @file /modules/admin/scripts/Admin.Ajax.ts
 * @author Arzz <arzz@arzz.com>
 * @license MIT License
 * @modified 2023. 6. 11.
 */
namespace Admin {
    export namespace Ajax {
        export interface Params {
            [key: string]: string | number;
        }

        export interface Data {
            [key: string]: any;
        }

        export interface Results {
            success: boolean;
            message?: string;
            total?: number;
            records?: any[];
            data?: Admin.Ajax.Data;
            [key: string]: any;
        }
    }

    export class Ajax {
        static fetchs: Map<string, Promise<Admin.Ajax.Results>> = new Map();

        /**
         * Fetch 요청의 UUID 값을 생성한다.
         *
         * @param {string} method - 요청방식
         * @param {string} url - 요청주소
         * @param {Admin.Ajax.Params} params - GET 데이터
         * @param {Admin.Ajax.Data} data - 전송할 데이터
         * @param {boolean|number} is_retry - 재시도여부
         * @return {string} uuid
         */
        static #uuid(
            method: string = 'GET',
            url: string,
            params: Admin.Ajax.Params = {},
            data: Admin.Ajax.Data = {},
            is_retry: boolean | number = true
        ): string {
            return Format.sha1(
                JSON.stringify({ method: method, url: url, params: params, data: data, is_retry: is_retry })
            );
        }

        /**
         * 짧은시간내에 동일한 Fetch 요청이 될 경우,
         * 제일 처음 요청된 Fetch 만 수행하고 응답된 데이터를 다른 중복요청한 곳으로 반환한다.
         *
         * @param {string} method - 요청방식
         * @param {string} url - 요청주소
         * @param {Admin.Ajax.Params} params - GET 데이터
         * @param {Admin.Ajax.Data} data - 전송할 데이터
         * @param {boolean|number} is_retry - 재시도여부
         * @return {Promise<Admin.Ajax.Results>} promise - 동일한 요청의 제일 첫번째 요청
         */
        static async #call(
            method: string = 'GET',
            url: string,
            params: Admin.Ajax.Params = {},
            data: Admin.Ajax.Data = {},
            is_retry: boolean | number = true
        ): Promise<Admin.Ajax.Results> {
            const uuid = Admin.Ajax.#uuid(method, url, params, data, is_retry);
            if (Admin.Ajax.fetchs.has(uuid) == true) {
                return Admin.Ajax.fetchs.get(uuid);
            }

            Admin.Ajax.fetchs.set(uuid, Admin.Ajax.#fetch(method, url, params, data, is_retry));
            return Admin.Ajax.fetchs.get(uuid);
        }

        /**
         * 실제 Fetch 함수를 실행한다.
         *
         * @param {string} method - 요청방식
         * @param {string} url - 요청주소
         * @param {Admin.Ajax.Params} params - GET 데이터
         * @param {Admin.Ajax.Data} data - 전송할 데이터
         * @param {boolean|number} is_retry - 재시도여부
         * @return {Promise<Admin.Ajax.Results>} results - 요청결과
         */
        static async #fetch(
            method: string = 'GET',
            url: string,
            params: Admin.Ajax.Params = {},
            data: Admin.Ajax.Data = {},
            is_retry: boolean | number = true
        ): Promise<Admin.Ajax.Results> {
            const uuid = Admin.Ajax.#uuid(method, url, params, data, is_retry);

            const requestUrl = new URL(url, location.origin);
            for (const name in params) {
                if (params[name] === null) {
                    requestUrl.searchParams.delete(name);
                } else {
                    requestUrl.searchParams.append(name, params[name].toString());
                }
            }
            url = requestUrl.toString();
            let retry = (is_retry === false ? 10 : is_retry) as number;

            try {
                const response: Response = (await fetch(url, {
                    // @todo DELETE 등 웹서버에서 지원하지 않을 경우 대체필요
                    method: method,
                    headers: {
                        'X-Method': method,
                        'Accept-Language': Admin.getLanguage(),
                        'Accept': 'application/json',
                        'Content-Type': 'application/json; charset=utf-8',
                    },
                    cache: 'no-store',
                    redirect: 'follow',
                    body: method == 'POST' || method == 'PUT' ? JSON.stringify(data) : null,
                }).catch((error) => {
                    Admin.Ajax.fetchs.delete(uuid);

                    if (retry <= 3) {
                        return Admin.Ajax.#call(method, url, params, data, ++retry);
                    } else {
                        Admin.Message.show({
                            icon: Admin.Message.ERROR,
                            title: Admin.printErrorText('TITLE'),
                            message: Admin.printErrorText('CONNECT_ERROR'),
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
                        title: Admin.printErrorText('TITLE'),
                        message: results.message,
                        buttons: Admin.Message.OK,
                    });
                }

                Admin.Ajax.fetchs.delete(uuid);

                return results;
            } catch (e) {
                Admin.Ajax.fetchs.delete(uuid);

                if (retry <= 3) {
                    return Admin.Ajax.#call(method, url, params, data, ++retry);
                } else {
                    Admin.Message.show({
                        icon: Admin.Message.ERROR,
                        title: Admin.printErrorText('TITLE'),
                        message: Admin.printErrorText('CONNECT_ERROR'),
                        buttons: Admin.Message.OK,
                    });

                    console.error(e);

                    return { success: false };
                }
            }
        }

        /**
         * GET 방식으로 데이터를 가져온다.
         *
         * @param {string} url - 요청주소
         * @param {Admin.Ajax.Params} params - GET 데이터
         * @param {boolean|number} is_retry - 재시도여부
         * @return {Promise<Admin.Ajax.Results>} results - 요청결과
         */
        static async get(
            url: string,
            params: Admin.Ajax.Params = {},
            is_retry: boolean | number = true
        ): Promise<Admin.Ajax.Results> {
            return Admin.Ajax.#call('GET', url, params, null, is_retry);
        }

        /**
         * POST 방식으로 데이터를 가져온다.
         * 전송할 데이터는 JSON 방식으로 전송된다.
         *
         * @param {string} url - 요청주소
         * @param {Admin.Ajax.Data} data - 전송할 데이터
         * @param {Admin.Ajax.Params} params - GET 데이터
         * @param {boolean|number} is_retry - 재시도여부
         * @return {Promise<Admin.Ajax.Results>} results - 요청결과
         */
        static async post(
            url: string,
            data: Admin.Ajax.Data = {},
            params: Admin.Ajax.Params = {},
            is_retry: boolean | number = true
        ): Promise<Admin.Ajax.Results> {
            return Admin.Ajax.#call('POST', url, params, data, is_retry);
        }

        /**
         * DELETE 방식으로 데이터를 가져온다.
         * 전송할 데이터는 JSON 방식으로 전송된다.
         *
         * @param {string} url - 요청주소
         * @param {Admin.Ajax.Params} params - GET 데이터
         * @param {boolean|number} is_retry - 재시도여부
         * @return {Promise<Admin.Ajax.Results>} results - 요청결과
         */
        static async delete(
            url: string,
            params: Admin.Ajax.Params = {},
            is_retry: boolean | number = true
        ): Promise<Admin.Ajax.Results> {
            return Admin.Ajax.#call('DELETE', url, params, null, is_retry);
        }
    }
}
