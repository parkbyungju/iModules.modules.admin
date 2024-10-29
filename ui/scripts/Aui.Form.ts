/**
 * 이 파일은 Aui 라이브러리의 일부입니다. (https://www.imodules.io)
 *
 * 폼 클래스를 정의한다.
 *
 * @file /scripts/Aui.Form.ts
 * @author Arzz <arzz@arzz.com>
 * @license MIT License
 * @modified 2024. 10. 28.
 */
namespace Aui {
    export namespace Form {
        export namespace Panel {
            export interface Listeners extends Aui.Panel.Listeners {
                /**
                 * @type {Function} render - 컴포넌트가 랜더링 되었을 때
                 */
                render?: (panel: Aui.Form.Panel) => void;

                /**
                 * @type {Function} load - 폼 데이터가 로딩되었을 때
                 */
                load?: (panel: Aui.Form.Panel, response: Ajax.Results) => void;

                /**
                 * @type {Function} submit - 폼 데이터가 전송되었을 때
                 */
                submit?: (panel: Aui.Form.Panel, response: Ajax.Results) => void;
            }

            export interface Properties extends Aui.Panel.Properties {
                /**
                 * @type {Aui.Form.FieldDefaults} fieldDefaults - 내부 필드의 기본설정값
                 */
                fieldDefaults?: Aui.Form.FieldDefaults;

                /**
                 * @type {string} loadingType - 로딩메시지 타입
                 */
                loadingType?: Aui.Loading.Type;

                /**
                 * @type {string} loadingText - 로딩메시지
                 */
                loadingText?: string;

                /**
                 * @type {Aui.Form.Panel.Listeners} listeners - 이벤트리스너
                 */
                listeners?: Aui.Form.Panel.Listeners;
            }
        }

        export class Panel extends Aui.Panel {
            loading: Aui.Loading;
            loadings: Map<Aui.Component, boolean> = new Map();
            fieldDefaults: Aui.Form.FieldDefaults;

            /**
             * 기본필드 클래스 생성한다.
             *
             * @param {Object} properties - 객체설정
             */
            constructor(properties: Aui.Form.Panel.Properties = null) {
                super(properties);

                this.role = 'form';
                this.fieldDefaults = this.properties.fieldDefaults ?? { labelAlign: 'right', labelWidth: 110 };

                this.loading = new Aui.Loading(this, {
                    type: this.properties.loadingType ?? 'column',
                    message: this.properties.loadingText ?? null,
                });
            }

            /**
             * 폼 패널의 하위 컴포넌트를 정의한다.
             */
            initItems(): void {
                if (this.items === null) {
                    this.items = [];

                    for (const item of this.properties.items ?? []) {
                        if (item instanceof Aui.Component) {
                            if (
                                item instanceof Aui.Form.FieldSet ||
                                item instanceof Aui.Form.Field.Container ||
                                item instanceof Aui.Form.Field.Base
                            ) {
                                item.setDefaults(this.fieldDefaults);
                            }

                            this.items.push(item);
                        }
                    }
                }

                super.initItems();
            }

            /**
             * 폼 패널에 속한 필드를 가져온다.
             *
             * @param {string} name - 필드명
             * @return {Aui.Form.Field.Base} field
             */
            getField(name: string): Aui.Form.Field.Base {
                for (const field of this.getFields()) {
                    if (field.name === name) {
                        return field;
                    }
                }

                return null;
            }

            /**
             * 폼 패널에 속한 모든 필드를 가져온다.
             *
             * @return {Aui.Form.Field.Base[]} fields
             */
            getFields(): Aui.Form.Field.Base[] {
                const fields: Aui.Form.Field.Base[] = [];
                for (const item of this.items ?? []) {
                    if (item instanceof Aui.Form.FieldSet) {
                        fields.push(...item.getFields());
                    } else if (item instanceof Aui.Form.Field.Container) {
                        fields.push(...item.getFields());
                    } else if (item instanceof Aui.Form.Field.Base) {
                        fields.push(item);
                    }
                }

                return fields;
            }

            /**
             * 폼 패널을 로딩상태로 설정한다.
             *
             * @param {Aui.Component} component - 로딩상태를 요청한 컴포넌트
             * @param {boolean} loading - 로딩여부
             * @param {string|boolean} message - 로딩메시지 표시여부
             */
            setLoading(component: Aui.Component, loading: boolean, message: string | boolean = false): void {
                this.loadings.set(component, loading);

                const isLoading = this.isLoading();
                if (isLoading == true && message !== false) {
                    if (typeof message == 'string') {
                        this.loading.setText(message);
                    }
                    this.loading.show();
                } else {
                    this.loading.hide();
                }
            }

            /**
             * 폼 패널이 로딩중인지 확인한다.
             *
             * @return {boolean} is_loading
             */
            isLoading(): boolean {
                for (const loading of this.loadings.values()) {
                    if (loading === true) {
                        return true;
                    }
                }

                return false;
            }

            /**
             * 폼 패널에 속한 모든 필드가 유효한지 확인한다.
             *
             * @return {boolean} is_valid
             */
            async isValid(): Promise<boolean> {
                if (this.isLoading() === true) {
                    Aui.Message.show({
                        title: Aui.getErrorText('INFO'),
                        message: Aui.printText('actions.waiting_retry'),
                        icon: Aui.Message.INFO,
                        buttons: Aui.Message.OK,
                    });
                    return false;
                }

                const validations: Promise<boolean>[] = [];

                this.getFields().forEach((field) => {
                    if (this.isDisabled() === false) {
                        validations.push(field.isValid());
                    }
                });

                const validates = await Promise.all(validations);
                for (const isValid of validates) {
                    if (isValid == false) {
                        return false;
                    }
                }

                return true;
            }

            /**
             * 에러가 발생한 첫번째 필드로 스크롤위치를 이동한다.
             */
            scrollToErrorField(): void {
                for (const field of this.getFields()) {
                    if (field.hasError() == true) {
                        const contentHeight = this.$getContent().getOuterHeight();
                        const position = field.$getComponent().getOffset().top - this.$getContent().getOffset().top;
                        if (position <= 0) {
                            this.getScroll()?.movePosition(0, position - 10, true, true);
                        } else if (position >= contentHeight) {
                            const scroll = position - contentHeight + field.$getComponent().getOuterHeight() + 10;
                            this.getScroll()?.movePosition(0, scroll, true, true);
                        }
                        break;
                    }
                }
            }

            /**
             * 폼 패널에 속한 모든 필드의 값을 가져온다.
             *
             * @return {Object} values
             */
            getValues(): { [key: string]: any } {
                const values: { [key: string]: any } = {};

                this.getFields().forEach((field) => {
                    Object.assign(values, field.getValues());
                });

                return values;
            }

            /**
             * 폼 패널 데이터를 불러온다.
             *
             * @param {Aui.Form.Request} request - 요청정보
             * @return {Promise<Ajax.results>} results
             */
            async load({ url, params = null, message = null }: Aui.Form.Request): Promise<Ajax.Results> {
                this.setLoading(this, true, message ?? true);

                const response = await Ajax.get(url, params);
                if (response.success == true) {
                    for (const name in response.data) {
                        this.getField(name)?.setValue(response.data[name], true);
                    }
                }

                this.setLoading(this, false);
                this.fireEvent('load', [this, response]);

                return response;
            }

            /**
             * 폼 패널을 전송한다.
             *
             * @param {Aui.Form.Request} request - 요청정보
             * @return {Promise<Ajax.results>} results
             */
            async submit({ url, params = null, message = null }: Aui.Form.Request): Promise<Ajax.Results> {
                if (this.isLoading() === true) {
                    Aui.Message.show({
                        title: Aui.getErrorText('INFO'),
                        message: Aui.printText('actions.waiting_retry'),
                        icon: Aui.Message.INFO,
                        buttons: Aui.Message.OK,
                    });
                    return { success: false };
                }

                const isValid = await this.isValid();
                if (isValid === false) {
                    this.scrollToErrorField();
                    return { success: false };
                }

                this.setLoading(this, true, message ?? Aui.printText('actions.saving_status'));

                const data = this.getValues();
                const response = await Ajax.post(url, data, params, false);
                if (response.success == false && typeof response.errors == 'object') {
                    for (const name in response.errors) {
                        this.getField(name)?.setError(true, response.errors[name]);
                    }
                    this.scrollToErrorField();
                }

                this.setLoading(this, false);
                this.fireEvent('submit', [this, response]);

                return response;
            }

            /**
             * 자식 컴포넌트를 추가한다.
             *
             * @param {Aui.Component} item - 추가할 컴포넌트
             * @param {number} position - 추가할 위치 (NULL 인 경우 제일 마지막 위치)
             */
            append(item: Aui.Component, position: number = null): void {
                if (item instanceof Aui.Form.Field.Base || item instanceof Aui.Form.FieldSet) {
                    item.setDefaults(this.fieldDefaults);
                }

                super.append(item, position);
            }
        }

        export interface FieldDefaults {
            /**
             * @type {number} labelWidth - 필드라벨 너비
             */
            labelWidth?: number;

            /**
             * @type {string} labelPosition - 필드라벨 위치
             */
            labelPosition?: 'top' | 'left';

            /**
             * @type {'left'|'center'|'right'} labelAlign - 필드라벨 텍스트정렬(기본값 : left)
             */
            labelAlign?: 'left' | 'center' | 'right';

            /**
             * @type {string} labelSeparator - 필드라벨 구분자(기본값 : ":")
             */
            labelSeparator?: string;

            /**
             * @type {string|number} width - 필드 전체너비
             */
            width?: string | number;
        }

        export interface Request {
            url: string;
            params?: Ajax.Params;
            message?: string;
        }

        export namespace FieldSet {
            export interface Properties extends Aui.Component.Properties {
                /**
                 * @type {string} title - 필드셋 제목
                 */
                title?: string;

                /**
                 * @type {string} helpText - 도움말
                 */
                helpText?: string;

                /**
                 * @type {boolean} collapsible - 축소가능여부
                 */
                collapsible?: boolean;

                /**
                 * @type {boolean} collapsed - 축소여부
                 */
                collapsed?: boolean;

                /**
                 * @type {Aui.Form.FieldDefaults} fieldDefaults - 필드셋 내부 필드 기본 설정
                 */
                fieldDefaults?: Aui.Form.FieldDefaults;
            }
        }

        export class FieldSet extends Aui.Component {
            title: string;
            fieldDefaults: Aui.Form.FieldDefaults;

            helpText: string;
            collapsible: boolean;
            collapsed: boolean;

            /**
             * 기본필드 클래스 생성한다.
             *
             * @param {Object} properties - 객체설정
             */
            constructor(properties: Aui.Form.FieldSet.Properties = null) {
                super(properties);

                this.type = 'form';
                this.role = 'fieldset';
                this.title = this.properties.title ?? null;
                this.fieldDefaults = this.properties.fieldDefaults ?? null;
                this.helpText = this.properties.helpText ?? null;
                this.collapsible = this.properties.collapsible === true;
                this.collapsed = this.properties.collapsed === true;

                this.$setTop();

                if (this.helpText !== null) {
                    this.$setBottom();
                }
            }

            /**
             * 폼 패널의 하위 컴포넌트를 정의한다.
             */
            initItems(): void {
                if (this.items === null) {
                    this.items = [];

                    for (const item of this.properties.items ?? []) {
                        if (item instanceof Aui.Component) {
                            if (
                                item instanceof Aui.Form.FieldSet ||
                                item instanceof Aui.Form.Field.Container ||
                                item instanceof Aui.Form.Field.Base
                            ) {
                                item.setDefaults(this.fieldDefaults);
                            }

                            this.items.push(item);
                        }
                    }
                }

                super.initItems();
            }

            /**
             * 필드 기본값을 적용한다.
             *
             * @param {Aui.Form.FieldDefaults} defaults - 필드 기본값
             */
            setDefaults(defaults: Aui.Form.FieldDefaults = null): void {
                this.initItems();

                this.fieldDefaults = this.fieldDefaults ?? defaults;

                for (const item of this.items) {
                    if (
                        item instanceof Aui.Form.FieldSet ||
                        item instanceof Aui.Form.Field.Container ||
                        item instanceof Aui.Form.Field.Base
                    ) {
                        item.setDefaults(this.fieldDefaults);
                    }
                }
            }

            /**
             * 상위 폼 패널을 가져온다.
             *
             * @return {Aui.Form.Panel} form
             */
            getForm(): Aui.Form.Panel {
                let parent = this.getParent();
                while (parent !== null) {
                    if (parent instanceof Aui.Form.Panel) {
                        return parent;
                    }

                    parent = parent.getParent();
                }

                return null;
            }

            /**
             * 필드셋에 속한 필드를 가져온다.
             *
             * @param {string} name - 필드명
             * @return {Aui.Form.Field.Base} field
             */
            getField(name: string): Aui.Form.Field.Base {
                for (const field of this.getFields()) {
                    if (field.name === name) {
                        return field;
                    }
                }

                return null;
            }

            /**
             * 필드셋에 속한 모든 필드를 가져온다.
             *
             * @return {Aui.Form.Field.Base[]} fields
             */
            getFields(): Aui.Form.Field.Base[] {
                const fields: Aui.Form.Field.Base[] = [];
                for (const item of this.items ?? []) {
                    if (item instanceof Aui.Form.FieldSet) {
                        fields.push(...item.getFields());
                    } else if (item instanceof Aui.Form.Field.Container) {
                        fields.push(...item.getFields());
                    } else if (item instanceof Aui.Form.Field.Base) {
                        fields.push(item);
                    }
                }

                return fields;
            }

            /**
             * 도움말을 변경한다.
             *
             * @param {string} text - 도움말
             */
            setHelpText(text: string): void {
                this.helpText = text;

                if (text === null) {
                    this.$removeBottom();
                    return;
                }

                const $bottom = this.$getBottom() ?? this.$setBottom();
                $bottom.empty();
                const $text = Html.create('p');
                $text.html(text);
                $bottom.append($text);
            }

            /**
             * 필드셋 비활성화여부를 설정한다.
             *
             * @param {boolean} disabled - 비활성화여부
             * @return {this} this
             */
            setDisabled(disabled: boolean): this {
                for (const item of this.items) {
                    item.setDisabled(disabled);
                }

                super.setDisabled(disabled);

                return this;
            }

            /**
             * 필드셋 축소/확장 여부를 토글한다.
             */
            toggleCollapse(animated: boolean = false): void {
                if (this.$getContainer().hasClass('collapsed') == true) {
                    this.expand(animated);
                } else {
                    this.collapse(animated);
                }
            }

            /**
             * 필드셋을 확장한다.
             */
            expand(animated: boolean = false): void {
                this.$getContainer().removeClass('collapsed');

                if (animated == true) {
                    const height = this.$getContent().getOuterHeight();
                    this.$getContainer().animate(
                        [{ height: 21 }, { height: height }],
                        { duration: 200, easing: 'ease-in-out' },
                        () => {
                            this.$getContainer().removeClass('collapsed');
                        }
                    );
                }
            }

            /**
             * 필드셋을 축소한다.
             */
            collapse(animated: boolean = false): void {
                if (animated == true) {
                    const height = this.$getContent().getOuterHeight();
                    this.$getContainer().animate(
                        [{ height: height }, { height: 21 }],
                        { duration: 200, easing: 'ease-in-out' },
                        () => {
                            this.$getContainer().addClass('collapsed');
                        }
                    );
                } else {
                    this.$getContainer().addClass('collapsed');
                }
            }

            /**
             * 자식 컴포넌트를 추가한다.
             *
             * @param {Aui.Component} item - 추가할 컴포넌트
             * @param {number} position - 추가할 위치 (NULL 인 경우 제일 마지막 위치)
             */
            append(item: Aui.Component, position: number = null): void {
                if (item instanceof Aui.Form.Field.Base || item instanceof Aui.Form.FieldSet) {
                    item.setDefaults(this.fieldDefaults);
                }

                super.append(item, position);
            }

            /**
             * 필드셋 제목을 랜더링한다.
             */
            renderTop(): void {
                const $top = this.$getTop();

                if (this.title !== null) {
                    const $legend = Html.create('legend');
                    $legend.html(this.title);
                    $top.append($legend);

                    if (this.collapsible == true) {
                        $legend.on('click', () => {
                            this.toggleCollapse(true);
                        });
                    }
                }
            }

            /**
             * 도움말 텍스트를 랜더링한다.
             */
            renderBottom(): void {
                if (this.helpText === null) return;

                const $bottom = this.$getBottom();
                const $text = Html.create('p');
                $text.html(this.helpText);
                $bottom.append($text);
            }

            /**
             * 필드셋을 랜더링한다.
             */
            render(): void {
                super.render();

                if (this.collapsible == true) {
                    this.$getContainer().addClass('collapsible');
                }

                if (this.collapsed == true) {
                    this.$getContainer().addClass('collapsed');
                }
            }
        }

        export namespace Field {
            export namespace Base {
                export interface Listeners extends Aui.Component.Listeners {
                    /**
                     * @type {Function} change - 필드값이 변경되었을 때
                     */
                    change?: (
                        field: Aui.Form.Field.Base,
                        value: any,
                        rawValue: any,
                        previousValue: any,
                        originValue: any
                    ) => void;

                    /**
                     * @type {Function} render - 필드가 랜더링 되었을 때
                     */
                    render?: (field: Aui.Form.Field.Base) => void;

                    /**
                     * @type {Function} show - 필드가 보일 때
                     */
                    show?: (field: Aui.Form.Field.Base) => void;

                    /**
                     * @type {Function} hide - 필드가 숨겨질 때
                     */
                    hide?: (field: Aui.Form.Field.Base) => void;

                    /**
                     * @type {Function} render - 필드가 포커싱 되었을 때
                     */
                    focus?: (field: Aui.Form.Field.Base) => void;

                    /**
                     * @type {Function} render - 필드가 포커싱이 해제되었을 때
                     */
                    blur?: (field: Aui.Form.Field.Base) => void;
                }

                export interface Properties extends Aui.Component.Properties {
                    /**
                     * @type {string} name - 필드명
                     */
                    name?: string;

                    /**
                     * @type {string} inputName - 폼 전송시 값이 전달될 필드명(NULL 인 경우 name 사용)
                     */
                    inputName?: string;

                    /**
                     * @type {boolean} allowBlank - 공백허용여부
                     */
                    allowBlank?: boolean;

                    /**
                     * @type {string} label - 라벨텍스트
                     */
                    label?: string;

                    /**
                     * @type {'top'|'left'} labelPosition - 라벨위치
                     */
                    labelPosition?: 'top' | 'left';

                    /**
                     * @type {'left'|'center'|'right'} labelAlign - 라벨정렬
                     */
                    labelAlign?: 'left' | 'center' | 'right';

                    /**
                     * @type {number} labelWidth - 라벨너비
                     */
                    labelWidth?: number;

                    /**
                     * @type {string} labelSeparator - 라벨구분자
                     */
                    labelSeparator?: string;

                    /**
                     * @type {string} fieldClass - 필드영역의 스타일시트
                     */
                    fieldClass?: string;

                    /**
                     * @type {string} helpText - 도움말
                     */
                    helpText?: string;

                    /**
                     * @type {string|number} width - 필드너비
                     */
                    width?: string | number;

                    /**
                     * @type {any} value - 필드값
                     */
                    value?: any;

                    /**
                     * @type {Function} validator - 필드값 유효성 체크 함수
                     */
                    validator?: (value: string, field: Aui.Form.Field.Base) => Promise<boolean | string>;

                    /**
                     * @type {boolean} readonly - 읽기전용여부
                     */
                    readonly?: boolean;

                    /**
                     * @type {Aui.Form.Field.Base.Listeners} listeners - 이벤트리스너
                     */
                    listeners?: Aui.Form.Field.Base.Listeners;
                }
            }

            export class Base extends Aui.Component {
                type: string = 'form';
                role: string = 'field';
                field: string = 'base';

                name: string;
                inputName: string;
                allowBlank: boolean;
                label: string;
                labelPosition: string;
                labelAlign: string;
                labelWidth: number;
                labelSeparator: string;
                fieldClass: string;
                helpText: string;

                value: any = null;
                pValue: any = null;
                oValue: any = null;
                validator: (value: string, field: Aui.Form.Field.Base) => Promise<boolean | string>;
                validation: boolean | string = true;
                readonly: boolean;

                fieldDefaults: Aui.Form.FieldDefaults;

                /**
                 * 기본필드 클래스 생성한다.
                 *
                 * @param {Aui.Form.Field.Base.Properties} properties - 객체설정
                 */
                constructor(properties: Aui.Form.Field.Base.Properties = null) {
                    super(properties);

                    this.name = this.properties.name ?? this.id;
                    this.inputName = this.properties.inputName === undefined ? this.name : this.properties.inputName;
                    this.allowBlank = this.properties.allowBlank !== false;
                    this.label = this.properties.label ?? null;
                    this.labelPosition = this.properties.labelPosition ?? null;
                    this.labelAlign = this.properties.labelAlign ?? null;
                    this.labelWidth = this.properties.labelWidth ?? null;
                    this.labelSeparator = this.properties.labelSeparator ?? null;
                    this.fieldClass = this.properties.fieldClass ?? null;
                    this.helpText = this.properties.helpText ?? null;
                    this.fieldDefaults = null;
                    this.scrollable = false;
                    this.validator = this.properties.validator ?? null;

                    this.value = undefined;
                    this.pValue = undefined;
                    this.oValue = this.properties.value;
                    this.readonly = this.properties.readonly === true;

                    if (this.label !== null) {
                        this.$setTop();
                    }

                    if (this.helpText !== null) {
                        this.$setBottom();
                    }
                }

                /**
                 * 필드 기본값을 적용한다.
                 *
                 * @param {Aui.Form.FieldDefaults} defaults - 필드 기본값
                 */
                setDefaults(defaults: Aui.Form.FieldDefaults = null): void {
                    this.initItems();

                    this.fieldDefaults = defaults;
                    this.labelWidth ??= defaults?.labelWidth ?? null;
                    this.labelPosition ??= defaults?.labelPosition ?? null;
                    this.labelAlign ??= defaults?.labelAlign ?? null;
                    this.labelSeparator ??= defaults?.labelSeparator ?? null;
                    this.width ??= defaults?.width ?? null;
                }

                /**
                 * 상위 폼 패널을 가져온다.
                 *
                 * @return {Aui.Form.Panel} form
                 */
                getForm(): Aui.Form.Panel {
                    let parent = this.getParent();
                    while (parent !== null) {
                        if (parent instanceof Aui.Form.Panel) {
                            return parent;
                        }

                        parent = parent.getParent();
                    }

                    return null;
                }

                /**
                 * 필드 라벨 위치를 가져온다.
                 *
                 * @return {string} labelPosition
                 */
                getLabelPosition(): string {
                    return this.labelPosition ?? 'left';
                }

                /**
                 * 필드 라벨 정렬방식을 가져온다.
                 *
                 * @return {string} labelAlign
                 */
                getLabelAlign(): string {
                    return this.labelAlign ?? 'left';
                }

                /**
                 * 필드 라벨의 너비를 가져온다.
                 *
                 * @return {number} labelWidth
                 */
                getLabelWidth(): number {
                    return this.labelWidth ?? 100;
                }

                /**
                 * 필드명을 가져온다.
                 *
                 * @return {string} name
                 */
                getName(): string {
                    return this.name;
                }

                /**
                 * 필드값을 지정한다.
                 *
                 * @param {any} value - 값
                 * @param {boolean} is_origin - 원본값 변경여부
                 */
                setValue(value: any, is_origin: boolean = false): void {
                    this.value = value;

                    if (is_origin == true) {
                        this.oValue = value;
                    } else {
                        this.onChange();
                        this.pValue = value;
                    }
                }

                /**
                 * 필드값을 가져온다.
                 *
                 * @return {any} value - 값
                 */
                getValue(): any {
                    return this.value ?? null;
                }

                /**
                 * 필드값을 가져온다.
                 *
                 * @return {any} raw_value - 값
                 */
                getRawValue(): any {
                    return this.value;
                }

                /**
                 * 모든 필드값을 가져온다.
                 *
                 * @return {any} value - 값
                 */
                getValues(): { [key: string]: any } {
                    const values: { [key: string]: any } = {};
                    if (this.inputName === null || this.isDisabled() == true) {
                        return values;
                    }

                    if (this.getValue() !== null) {
                        values[this.inputName] = this.getValue();
                    }

                    return values;
                }

                /**
                 * 필드값을 원상태로 복원한다.
                 *
                 * @param {boolean} is_fire_event - 변경이벤트 발생여부
                 */
                rollback(is_fire_event: boolean = true): void {
                    if (this.isDirty() == true) {
                        if (this.oValue !== undefined) {
                            this.setValue(this.oValue, true);
                        } else {
                            this.setValue(null, true);
                        }

                        if (is_fire_event == true) {
                            this.onChange();
                        }
                    }
                }

                /**
                 * 필드에 포커스를 지정한다.
                 */
                focus(): void {
                    this.onFocus();
                }

                /**
                 * 필드에 포커스를 해제한다.
                 */
                blur(): void {
                    this.onBlur();
                }

                /**
                 * 필드값 변경여부를 가져온다.
                 *
                 * @return {boolean} is_dirty
                 */
                isDirty(): boolean {
                    return Format.isEqual(this.value, this.oValue) !== true;
                }

                /**
                 * 필드값이 비어있는지 확인한다.
                 *
                 * @return {boolean} is_blank
                 */
                isBlank(): boolean {
                    const value = this.getValue();
                    if (value === null) {
                        return true;
                    } else if (typeof value == 'object') {
                        if (value.length == 0) {
                            return true;
                        }
                    } else if (value.toString().length == 0) {
                        return true;
                    }

                    return false;
                }

                /**
                 * 필드값이 유효한지 확인하고 에러여부를 저장한다.
                 *
                 * @return {boolean} is_valid
                 */
                async isValid(): Promise<boolean> {
                    if (this.isDisabled() === true) {
                        return true;
                    }

                    const validation = await this.validate();
                    this.validation = validation;

                    if (validation !== true) {
                        this.setError(true, validation as string);
                    } else {
                        this.setError(false);
                    }

                    return validation === true;
                }

                /**
                 * 필드값이 유효한지 확인한다.
                 *
                 * @return {boolean|string} validation
                 */
                async validate(): Promise<boolean | string> {
                    if (this.allowBlank === false && this.isBlank() == true) {
                        return Aui.getErrorText('REQUIRED');
                    }

                    if (typeof this.validator == 'function') {
                        return await this.validator(this.getValue(), this);
                    }

                    return true;
                }

                /**
                 * 추가적인 에러검증없이 현재 에러가 존재하는지 확인한다.
                 *
                 * @return {boolean} hasError
                 */
                hasError(): boolean {
                    return this.validation !== true;
                }

                /**
                 * 도움말을 변경한다.
                 *
                 * @param {string} text - 도움말
                 */
                setHelpText(text: string): void {
                    this.helpText = text;

                    if (text === null) {
                        this.$removeBottom();
                        return;
                    }

                    const $bottom = this.$getBottom() ?? this.$setBottom();
                    $bottom.empty();
                    const $text = Html.create('p');
                    $text.html(text);
                    $bottom.append($text);

                    this.updateLayout();
                }

                /**
                 * 에러메시지를 변경한다.
                 *
                 * @param {boolean} is_error - 에러여부
                 * @param {string} message - 에러메시지 (NULL 인 경우 에러메시지를 출력하지 않는다.)
                 */
                setError(is_error: boolean, message: string = null): void {
                    if (is_error === true) {
                        this.$getContent().addClass('error');
                        this.validation = message ?? false;
                    } else {
                        this.$getContent().removeClass('error');
                        message = null;
                        this.validation = true;
                    }

                    if (this.getParent() instanceof Aui.Form.Field.Container) {
                        const container = this.getParent() as Aui.Form.Field.Container;
                        if (container.label !== null || container.combineValidate == true) {
                            container.setError(this.getId(), is_error, message);
                            return;
                        }
                    }

                    if (message === null) {
                        this.setHelpText(this.helpText);
                        this.$getBottom()?.removeClass('error');
                    } else {
                        const $bottom = this.$getBottom() ?? this.$setBottom();
                        $bottom.empty();
                        const $text = Html.create('p');
                        $text.html(message);
                        $bottom.append($text);
                        this.$getBottom().addClass('error');
                    }

                    this.updateLayout();
                }

                /**
                 * 필드 비활성화여부를 설정한다.
                 *
                 * @param {boolean} disabled - 비활성화여부
                 * @return {this} this
                 */
                setDisabled(disabled: boolean): this {
                    if (disabled == true) {
                        this.$getContainer().addClass('disabled');
                        this.$getContent().addClass('disabled');
                    } else {
                        this.$getContainer().removeClass('disabled');
                        this.$getContent().removeClass('disabled');
                    }

                    if (this.getParent() instanceof Aui.Form.Field.Base) {
                        super.setDisabled(disabled);
                    } else {
                        if (this.disabled != disabled) {
                            super.setDisabled(disabled);

                            if (disabled == false) {
                                this.onChange();
                            }
                        }
                    }

                    return this;
                }

                /**
                 * 필드 라벨을 랜더링한다.
                 */
                renderTop(): void {
                    if (this.label === null) return;

                    const $top = this.$getTop();
                    const $label = Html.create('label');
                    $label.html((this.labelSeparator ?? '<i class="separator">:</i>') + this.label);
                    $label.addClass(this.getLabelAlign());
                    $top.append($label);
                }

                /**
                 * 도움말 텍스트를 랜더링한다.
                 */
                renderBottom(): void {
                    if (this.helpText === null) return;

                    const $bottom = this.$getBottom();
                    const $text = Html.create('p');
                    $text.html(this.helpText);
                    $bottom.append($text);
                }

                /**
                 * 필드를 랜더링한다.
                 */
                render(): void {
                    if (this.name !== null) {
                        this.$getComponent().setData('name', this.name);
                    }
                    this.$getContainer().addClass(this.getLabelPosition());
                    if (this.allowBlank === false) {
                        this.$getContainer().addClass('required');
                    }
                    this.$getContent().setData('field', this.field);

                    if (this.fieldClass !== null) {
                        this.$getContent().addClass(...this.fieldClass.split(' '));
                    }

                    this.updateLayout();
                    super.render();
                }

                /**
                 * 필드 레이아웃을 업데이트한다.
                 */
                updateLayout(): void {
                    this.setWidth(this.width);

                    if (this.label !== null) {
                        if (this.getLabelPosition() == 'left' || this.getLabelPosition() == 'right') {
                            if (this.getLabelWidth() > 0) {
                                this.$getTop().setStyle('width', this.getLabelWidth() + 'px');
                                this.$getContent().setStyle('width', 'calc(100% - ' + this.getLabelWidth() + 'px)');
                            }
                        } else {
                            this.$getTop().setStyle('width', '100%');
                            this.$getContent().setStyle('width', '100%');
                        }
                    } else {
                        this.$getContent().setStyle('width', '100%');
                    }

                    if (this.$getBottom() !== null) {
                        if (this.getLabelPosition() == 'left') {
                            this.$getBottom().setStyle(
                                'padding-left',
                                this.label == null ? 0 : this.getLabelWidth() + 'px'
                            );
                        }
                        if (this.getLabelPosition() == 'right') {
                            this.$getBottom().setStyle(
                                'padding-right',
                                this.label == null ? 0 : this.getLabelWidth() + 'px'
                            );
                        }
                    }
                }

                /**
                 * 필드가 랜더링되었을 때 이벤트를 처리한다.
                 */
                onRender(): void {
                    if (this.oValue !== undefined && this.value === undefined) {
                        this.setValue(this.oValue, true);
                    }
                    super.onRender();
                }

                /**
                 * 입력값이 변경되었을 때 이벤트를 처리한다.
                 */
                onChange(): void {
                    if (Format.isEqual(this.getValue(), this.pValue) == false) {
                        this.fireEvent('change', [this, this.getValue(), this.getRawValue(), this.pValue, this.oValue]);
                    }
                }

                /**
                 * 포커스 지정시 이벤트를 처리한다.
                 */
                onFocus(): void {
                    this.fireEvent('focus', [this]);
                }

                /**
                 * 포커스 해제시 이벤트를 처리한다.
                 */
                onBlur(): void {
                    this.isValid();
                    this.fireEvent('blur', [this]);
                }
            }

            export namespace Container {
                export interface Properties extends Aui.Form.Field.Base.Properties {
                    /**
                     * @type {'row' | 'column'} direction - 정렬방향
                     */
                    direction?: 'row' | 'column';

                    /**
                     * @type {boolean} combineValidate - 에러메시지 통합여부
                     */
                    combineValidate?: boolean;
                }
            }

            export class Container extends Aui.Component {
                type: string = 'form';
                role: string = 'field';
                field: string = 'container';

                label: string;
                labelPosition: string;
                labelAlign: string;
                labelWidth: number;
                labelSeparator: string;
                helpText: string;
                fieldDefaults: Aui.Form.FieldDefaults;
                allowBlank: boolean = true;
                errors: Map<string, { is_error: boolean; message: string }> = new Map();
                direction: 'row' | 'column' = 'row';
                combineValidate: boolean;

                $fields: Dom;

                /**
                 * 필드 컨테이너를 생성한다.
                 *
                 * @param {Aui.Form.Field.Container.Properties} properties - 객체설정
                 */
                constructor(properties: Aui.Form.Field.Container.Properties = null) {
                    super(properties);

                    this.label = this.properties.label ?? null;
                    this.labelPosition = this.properties.labelPosition ?? null;
                    this.labelAlign = this.properties.labelAlign ?? null;
                    this.labelWidth = this.properties.labelWidth ?? null;
                    this.labelSeparator = this.properties.labelSeparator ?? null;
                    this.helpText = this.properties.helpText ?? null;
                    this.fieldDefaults = null;
                    this.scrollable = false;
                    this.allowBlank = true;

                    this.direction = this.properties.direction ?? 'row';
                    this.combineValidate = this.properties.combineValidate === true;

                    if (this.label !== null) {
                        this.$setTop();
                    }

                    if (this.helpText !== null) {
                        this.$setBottom();
                    }
                }

                /**
                 * 필드의 하위 필드를 정의한다.
                 */
                initItems(): void {
                    if (this.items === null) {
                        this.items = [];

                        for (const item of this.properties.items ?? []) {
                            if (item instanceof Aui.Component) {
                                if (
                                    item instanceof Aui.Form.FieldSet ||
                                    item instanceof Aui.Form.Field.Container ||
                                    item instanceof Aui.Form.Field.Base
                                ) {
                                    item.setDefaults(this.fieldDefaults);

                                    if (item instanceof Aui.Form.Field.Base) {
                                        this.allowBlank = this.allowBlank == true && item.allowBlank;
                                    }
                                }

                                this.items.push(item);
                            }
                        }
                    }

                    super.initItems();
                }

                /**
                 * 하위필드가 위치하는 DOM 객체를 가져온다.
                 *
                 * @return {Dom} $fields
                 */
                $getFields(): Dom {
                    if (this.$fields === undefined) {
                        this.$fields = Html.create('div', { 'data-role': 'fields' });
                        this.$fields.addClass(this.direction);
                    }

                    return this.$fields;
                }

                /**
                 * 필드 기본값을 적용한다.
                 *
                 * @param {Aui.Form.FieldDefaults} defaults - 필드 기본값
                 */
                setDefaults(defaults: Aui.Form.FieldDefaults = null): void {
                    this.initItems();

                    this.fieldDefaults = defaults;
                    this.labelWidth ??= defaults?.labelWidth ?? null;
                    this.labelPosition ??= defaults?.labelPosition ?? null;
                    this.labelAlign ??= defaults?.labelAlign ?? null;
                    this.labelSeparator ??= defaults?.labelSeparator ?? null;
                    this.width ??= defaults?.width ?? null;

                    for (const item of this.items) {
                        if (
                            item instanceof Aui.Form.FieldSet ||
                            item instanceof Aui.Form.Field.Container ||
                            item instanceof Aui.Form.Field.Base
                        ) {
                            item.setDefaults(defaults);
                        }
                    }
                }

                /**
                 * 상위 폼 패널을 가져온다.
                 *
                 * @return {Aui.Form.Panel} form
                 */
                getForm(): Aui.Form.Panel {
                    let parent = this.getParent();
                    while (parent !== null) {
                        if (parent instanceof Aui.Form.Panel) {
                            return parent;
                        }

                        parent = parent.getParent();
                    }

                    return null;
                }

                /**
                 * 필드 라벨 위치를 가져온다.
                 *
                 * @return {string} labelPosition
                 */
                getLabelPosition(): string {
                    return this.labelPosition ?? 'left';
                }

                /**
                 * 필드 라벨 정렬방식을 가져온다.
                 *
                 * @return {string} labelAlign
                 */
                getLabelAlign(): string {
                    return this.labelAlign ?? 'left';
                }

                /**
                 * 필드 라벨의 너비를 가져온다.
                 *
                 * @return {number} labelWidth
                 */
                getLabelWidth(): number {
                    return this.labelWidth ?? 100;
                }

                /**
                 * 도움말을 변경한다.
                 *
                 * @param {string} text - 도움말
                 */
                setHelpText(text: string): void {
                    this.helpText = text;

                    if (text === null) {
                        this.$removeBottom();
                        return;
                    }

                    const $bottom = this.$getBottom() ?? this.$setBottom();
                    $bottom.empty();
                    const $text = Html.create('p');
                    $text.html(text);
                    $bottom.append($text);

                    if (this.getLabelPosition() == 'left') {
                        this.$getBottom().setStyle(
                            'padding-left',
                            this.label == null ? 0 : this.getLabelWidth() + 'px'
                        );
                    }
                    if (this.getLabelPosition() == 'right') {
                        this.$getBottom().setStyle(
                            'padding-right',
                            this.label == null ? 0 : this.getLabelWidth() + 'px'
                        );
                    }
                }

                /**
                 * 에러메시지를 변경한다.
                 *
                 * @param {string} id - 필드고유값
                 * @param {boolean} is_error - 에러여부
                 * @param {string} message - 에러메시지 (NULL 인 경우 에러메시지를 출력하지 않는다.)
                 */
                setError(id: string, is_error: boolean, message: string = null): void {
                    if (this.getParent() instanceof Aui.Form.Field.Container) {
                        (this.getParent() as Aui.Form.Field.Container).setError(this.getId(), is_error, message);
                        return;
                    }

                    this.errors.set(id, { is_error: is_error, message: message });
                    this.updateError();
                }

                /**
                 * 에러메시지를 업데이트한다.
                 */
                updateError(): void {
                    this.setHelpText(this.helpText);
                    this.$getBottom()?.removeClass('error');

                    const messages: string[] = [];
                    this.errors.forEach(({ is_error, message }) => {
                        if (is_error == true && message !== null) {
                            messages.push(message);
                        }
                    });

                    if (messages.length > 0) {
                        const $bottom = this.$getBottom() ?? this.$setBottom();
                        $bottom.empty();
                        const $text = Html.create('p');
                        $text.html(messages.join('<br>'));
                        $bottom.append($text);
                        this.$getBottom().addClass('error');

                        if (this.getLabelPosition() == 'left') {
                            this.$getBottom().setStyle(
                                'padding-left',
                                this.label == null ? 0 : this.getLabelWidth() + 'px'
                            );
                        }
                        if (this.getLabelPosition() == 'right') {
                            this.$getBottom().setStyle(
                                'padding-right',
                                this.label == null ? 0 : this.getLabelWidth() + 'px'
                            );
                        }
                    }
                }

                /**
                 * 필드 컨테이너에 속한 모든 필드를 가져온다.
                 *
                 * @return {Aui.Form.Field.Base[]} fields
                 */
                getFields(): Aui.Form.Field.Base[] {
                    const fields: Aui.Form.Field.Base[] = [];
                    for (const item of this.items ?? []) {
                        if (item instanceof Aui.Form.FieldSet) {
                            fields.push(...item.getFields());
                        } else if (item instanceof Aui.Form.Field.Container) {
                            fields.push(...item.getFields());
                        } else if (item instanceof Aui.Form.Field.Base) {
                            fields.push(item);
                        }
                    }

                    return fields;
                }

                /**
                 * 필드 컨테이너에 속한 모든 필드의 값을 가져온다.
                 *
                 * @return {Object} values
                 */
                getValues(): { [key: string]: any } {
                    const values: { [key: string]: any } = {};

                    this.getFields().forEach((field) => {
                        Object.assign(values, field.getValues());
                    });

                    return values;
                }

                /**
                 * 필드 컨테이너에 속한 모든 필드의 값을 가져온다.
                 *
                 * @param {Object} values
                 */
                setValues(values: { [key: string]: any }): void {
                    this.getFields().forEach((field) => {
                        if (field.inputName !== undefined && values[field.inputName] !== undefined) {
                            field.setValue(values[field.inputName]);
                        }
                    });
                }

                /**
                 * 자식 컴포넌트를 추가한다.
                 *
                 * @param {Aui.Component} item - 추가할 컴포넌트
                 * @param {number} position - 추가할 위치 (NULL 인 경우 제일 마지막 위치)
                 */
                append(item: Aui.Component, position: number = null): void {
                    if (this.items === null) {
                        this.items = [];
                    }
                    item.setParent(this);

                    if (item instanceof Aui.Form.Field.Base || item instanceof Aui.Form.FieldSet) {
                        item.setDefaults(this.fieldDefaults);
                    }

                    if (position === null || position >= (this.items.length ?? 0)) {
                        this.items.push(item);
                    } else if (position < 0 && Math.abs(position) >= (this.items.length ?? 0)) {
                        this.items.unshift(item);
                    } else {
                        this.items.splice(position, 0, item);
                    }

                    if (this.isRendered() == true) {
                        this.$getFields().append(item.$getComponent(), position);
                        if (item.isRenderable() == true) {
                            item.render();
                        }
                    }
                }

                /**
                 * 필드 비활성화여부를 설정한다.
                 *
                 * @param {boolean} disabled - 비활성여부
                 * @return {Aui.Form.Field.TextArea} this
                 */
                setDisabled(disabled: boolean): this {
                    const items = this.items ?? [];
                    for (let i = 0, loop = items.length; i < loop; i++) {
                        items[i].setDisabled(disabled);
                    }

                    super.setDisabled(disabled);

                    return this;
                }

                /**
                 * 필드 라벨을 랜더링한다.
                 */
                renderTop(): void {
                    if (this.label === null) return;

                    const $top = this.$getTop();
                    const $label = Html.create('label');
                    $label.html((this.labelSeparator ?? '<i class="separator">:</i>') + this.label);
                    $label.addClass(this.getLabelAlign());
                    $top.append($label);
                }

                /**
                 * 필드 컨테이너에 속한 필드를 랜더링한다.
                 */
                renderContent(): void {
                    const $fields = this.$getFields();
                    this.$getContent().append($fields);
                    for (let item of this.getItems()) {
                        $fields.append(item.$getComponent());

                        if (item.properties.flex !== undefined) {
                            item.$getComponent().setStyle(
                                'flex-grow',
                                item.properties.flex === true ? 1 : item.properties.flex
                            );
                            item.$getComponent().setStyle('flex-basis', 0);
                            item.$getComponent().addClass('flex');
                        }

                        if (item.isRenderable() == true) {
                            item.render();
                        }
                    }
                }

                /**
                 * 도움말 텍스트를 랜더링한다.
                 */
                renderBottom(): void {
                    if (this.helpText === null) return;

                    const $bottom = this.$getBottom();
                    const $text = Html.create('p');
                    $text.html(this.helpText);
                    $bottom.append($text);
                }

                /**
                 * 필드를 랜더링한다.
                 */
                render(): void {
                    this.$getContainer().addClass(this.getLabelPosition());
                    if (this.allowBlank === false) {
                        this.$getContainer().addClass('required');
                    }

                    this.$getContent().setData('field', this.field);
                    this.updateLayout();
                    super.render();
                }

                /**
                 * 필드 레이아웃을 업데이트한다.
                 */
                updateLayout(): void {
                    this.setWidth(this.width);

                    if (this.label !== null) {
                        if (this.getLabelPosition() == 'left' || this.getLabelPosition() == 'right') {
                            if (this.getLabelWidth() > 0) {
                                this.$getTop().setStyle('width', this.getLabelWidth() + 'px');
                                this.$getContent().setStyle('width', 'calc(100% - ' + this.getLabelWidth() + 'px)');
                            }
                        } else {
                            this.$getTop().setStyle('width', '100%');
                            this.$getContent().setStyle('width', '100%');
                        }
                    } else {
                        this.$getContent().setStyle('width', '100%');
                    }

                    if (this.helpText !== null) {
                        if (this.getLabelPosition() == 'left') {
                            this.$getBottom().setStyle(
                                'padding-left',
                                this.label == null ? 0 : this.getLabelWidth() + 'px'
                            );
                        }
                        if (this.getLabelPosition() == 'right') {
                            this.$getBottom().setStyle(
                                'padding-right',
                                this.label == null ? 0 : this.getLabelWidth() + 'px'
                            );
                        }
                    }
                }
            }

            export class Hidden extends Aui.Form.Field.Base {
                field: string = 'hidden';

                /**
                 * 기본필드 클래스 생성한다.
                 *
                 * @param {Aui.Form.Field.Base.Properties} properties - 객체설정
                 */
                constructor(properties: Aui.Form.Field.Base.Properties = null) {
                    super(properties);
                }

                /**
                 * 숨김필드이므로 콘텐츠를 랜더링하지 않는다.
                 */
                renderContent(): void {}

                /**
                 * 필드가 랜더링이 완료되었을 때 이벤트를 처리한다.
                 */
                onRender(): void {
                    super.onRender();
                    this.hide();
                }
            }

            export namespace Text {
                export interface Listeners extends Aui.Form.Field.Base.Listeners {
                    /**
                     * @type {Function} keydown - 필드에서 키보드 입력이 되었을 때
                     */
                    keydown?: (field: Aui.Form.Field.Base, e: KeyboardEvent) => void;

                    /**
                     * @type {Function} enter - 필드에서 엔터키 입력이 되었을 때
                     */
                    enter?: (field: Aui.Form.Field.Base, value: any, e: KeyboardEvent) => void;
                }

                export interface Properties extends Aui.Form.Field.Base.Properties {
                    /**
                     * @type {string} emptyText - 필드값이 없을 경우 보일 placeHolder
                     */
                    emptyText?: string;

                    /**
                     * @type {string} inputAlign - 필드내 텍스트 정렬
                     */
                    inputAlign?: string;

                    /**
                     * @type {boolean} is_trim - 데이터값의 앞뒤 공백을 제거할지 여부 (기본값 TRUE)
                     */
                    is_trim?: boolean;

                    /**
                     * @type {boolean} is_trim - 빈값일 경우 NULL 을 반환할지 여부 (기본값 FALSE)
                     */
                    is_null?: boolean;

                    /**
                     * @type {Aui.Form.Field.Text.Listeners} listeners - 이벤트리스너
                     */
                    listeners?: Aui.Form.Field.Text.Listeners;
                }
            }

            export class Text extends Aui.Form.Field.Base {
                field: string = 'text';
                inputType: string = 'text';
                emptyText: string;

                inputAlign: string = null;
                is_trim: boolean;
                is_null: boolean;

                $input: Dom;
                $emptyText: Dom;

                /**
                 * 텍스트필드 클래스 생성한다.
                 *
                 * @param {Aui.Form.Field.Text.Properties} properties - 객체설정
                 */
                constructor(properties: Aui.Form.Field.Text.Properties = null) {
                    super(properties);

                    this.emptyText = this.properties.emptyText ?? '';
                    this.emptyText = this.emptyText.length == 0 ? null : this.emptyText;

                    this.inputAlign = this.properties.inputAlign ?? null;
                    this.is_trim = this.properties.is_trim !== false;
                    this.is_null = this.properties.is_null === true;
                }

                /**
                 * INPUT 필드 DOM 을 가져온다.
                 *
                 * @return {Dom} $input
                 */
                $getInput(): Dom {
                    if (this.$input === undefined) {
                        this.$input = Html.create('input', {
                            type: this.inputType,
                            name: this.inputName,
                        });
                        if (this.inputAlign !== null) {
                            this.$input.setStyle('text-align', this.inputAlign);
                        }
                        if (this.readonly == true) {
                            this.$input.setAttr('readonly', 'readonly');
                        }
                        this.$input.on('keydown', (e: KeyboardEvent) => {
                            if (e.key == 'Enter') {
                                this.enter(e);
                            }

                            this.keydown(e);
                        });
                        this.$input.on('input', (e: InputEvent) => {
                            const input = e.currentTarget as HTMLInputElement;
                            this.setValue(input.value);
                        });
                        this.$input.on('focus', () => {
                            this.onFocus();
                        });
                        this.$input.on('blur', () => {
                            this.onBlur();
                        });
                    }

                    return this.$input;
                }

                /**
                 * placeHolder DOM 객체를 가져온다.
                 *
                 * @return {Dom} $emptyText
                 */
                $getEmptyText(): Dom {
                    if (this.$emptyText === undefined) {
                        this.$emptyText = Html.create('div', { 'data-role': 'empty' });
                    }

                    return this.$emptyText;
                }

                /**
                 * placeHolder 문자열을 설정한다.
                 *
                 * @param {string} emptyText - placeHolder (NULL 인 경우 표시하지 않음)
                 */
                setEmptyText(emptyText: string = null): void {
                    this.emptyText = emptyText === null || emptyText.length == 0 ? null : emptyText;

                    if (this.isRendered() == true) {
                        this.updateLayout();
                    }
                }

                /**
                 * 필드 비활성화여부를 설정한다.
                 *
                 * @param {boolean} disabled - 비활성여부
                 * @return {Aui.Form.Field.TextArea} this
                 */
                setDisabled(disabled: boolean): this {
                    if (disabled == true) {
                        this.$getInput().setAttr('disabled', 'disabled');
                    } else {
                        this.$getInput().removeAttr('disabled');
                    }

                    super.setDisabled(disabled);

                    return this;
                }

                /**
                 * 필드값을 지정한다.
                 *
                 * @param {any} value - 값
                 * @param {boolean} is_origin - 원본값 변경여부
                 */
                setValue(value: any, is_origin: boolean = false): void {
                    value = value?.toString() ?? '';
                    if (this.$getInput().getData('renderer') !== true && this.$getInput().getValue() != value) {
                        this.$getInput().setValue(value);
                    }

                    if (value.length > 0) {
                        this.$getEmptyText().hide();
                    } else {
                        this.$getEmptyText().show();
                    }

                    super.setValue(value, is_origin);
                }

                /**
                 * 필드값을 가져온다.
                 *
                 * @return {any} value - 값
                 */
                getValue(): any {
                    let value = this.value ?? null;
                    if (value !== null && this.is_trim == true) {
                        value = value.trim();
                    }

                    if (value === null || (this.is_null == true && value.length == 0)) {
                        return null;
                    }

                    return value;
                }

                /**
                 * 필드에 포커스를 지정한다.
                 */
                focus(): void {
                    this.$getInput().focus();
                }

                /**
                 * 필드에 포커스를 해제한다.
                 */
                blur(): void {
                    this.$getInput().blur();
                }

                /**
                 * 필드의 키보드 이벤트를 처리한다.
                 *
                 * @param {KeyboardEvent} e
                 */
                keydown(e: KeyboardEvent): void {
                    this.fireEvent('keydown', [this, e]);
                }

                /**
                 * 필드의 키보드 이벤트를 처리한다.
                 *
                 * @param {KeyboardEvent} e
                 */
                enter(e: KeyboardEvent): void {
                    this.fireEvent('enter', [this, this.getValue(), e]);
                }

                /**
                 * INPUT 태그를 랜더링한다.
                 */
                renderContent(): void {
                    const $input = this.$getInput();
                    this.$getContent().append($input);
                }

                /**
                 * 필드 레이아웃을 업데이트한다.
                 */
                updateLayout(): void {
                    super.updateLayout();

                    if (this.properties.emptyText !== null) {
                        const $emptyText = this.$getEmptyText();
                        $emptyText.html(this.emptyText);
                        this.$getContent().append($emptyText);
                    } else {
                        this.$getEmptyText().remove();
                    }
                }
            }

            export namespace Date {
                export interface Properties extends Aui.Form.Field.Text.Properties {
                    /**
                     * @type {string} format - 데이터 전송시 날짜포맷
                     */
                    format?: string;

                    /**
                     * @type {string} displayFormat - 필드에 보일 날짜포맷
                     */
                    displayFormat?: string;
                }
            }

            export class Date extends Aui.Form.Field.Base {
                field: string = 'date';
                emptyText: string;

                format: string;
                displayFormat: string;

                absolute: Aui.Absolute;
                calendar: Aui.Form.Field.Date.Calendar;

                $input: Dom;
                $button: Dom;
                $emptyText: Dom;

                /**
                 * 텍스트필드 클래스 생성한다.
                 *
                 * @param {Aui.Form.Field.Text.Properties} properties - 객체설정
                 */
                constructor(properties: Aui.Form.Field.Text.Properties = null) {
                    super(properties);

                    this.emptyText = this.properties.emptyText ?? '';
                    this.emptyText = this.emptyText.length == 0 ? null : this.emptyText;

                    this.format = this.properties.format ?? 'Y-m-d';
                    this.displayFormat = this.properties.displayFormat ?? 'Y-m-d';
                }

                /**
                 * 절대위치 목록 컴포넌트를 가져온다.
                 *
                 * @return {Aui.Absolute} absolute
                 */
                getAbsolute(): Aui.Absolute {
                    if (this.absolute === undefined) {
                        this.absolute = new Aui.Absolute({
                            $target: this.$getContent(),
                            items: [this.getCalendar()],
                            hideOnClick: true,
                            parent: this,
                            border: false,
                            listeners: {
                                show: () => {
                                    this.$getContent().addClass('expand');
                                },
                                hide: () => {
                                    this.$getContent().removeClass('expand');
                                },
                            },
                        });
                    }

                    return this.absolute;
                }

                /**
                 * 달력 컴포넌트를 가져온다.
                 *
                 * @return {Aui.Form.Field.Date.Calendar} calendar
                 */
                getCalendar(): Aui.Form.Field.Date.Calendar {
                    if (this.calendar === undefined) {
                        this.calendar = new Aui.Form.Field.Date.Calendar({
                            parent: this,
                            listeners: {
                                change: (value) => {
                                    this.setValue(value);
                                    this.collapse();
                                },
                            },
                        });
                    }

                    return this.calendar;
                }

                /**
                 * INPUT 필드 DOM 을 가져온다.
                 *
                 * @return {Dom} $input
                 */
                $getInput(): Dom {
                    if (this.$input === undefined) {
                        this.$input = Html.create('input', {
                            type: 'text',
                            name: this.inputName,
                        });
                        this.$input.on('input', () => {
                            const value = this.$input.getValue();
                            if (value.length == 0) {
                                this.$getEmptyText().show();
                            } else {
                                this.$getEmptyText().hide();

                                if (
                                    value.search(/^[0-9]{4}(\.|\-)?[0-9]{2}(\.|\-)?[0-9]{2}$/) === 0 &&
                                    moment(value).isValid() == true
                                ) {
                                    this.setValue(moment(value));
                                    this.setError(false);
                                } else {
                                    this.setError(true, null);
                                }
                            }
                        });
                        this.$input.on('keydown', (e: KeyboardEvent) => {
                            if (e.key == 'ArrowUp' || e.key == 'ArrowDown') {
                                if (this.value instanceof moment) {
                                    this.setValue(this.value.clone().add(e.key == 'ArrowUp' ? -1 : 1, 'd'));
                                }
                            }

                            if (e.key == 'Enter') {
                                this.enter(e);
                            }

                            this.keydown(e);
                        });
                        this.$input.on('copy', (e: ClipboardEvent) => {
                            if (this.value) {
                                if (this.value instanceof moment) {
                                    e.clipboardData.setData('text/plain', this.value.format('YYYY-MM-DD'));
                                    e.preventDefault();
                                }
                            }
                        });
                    }

                    return this.$input;
                }

                /**
                 * placeHolder DOM 객체를 가져온다.
                 *
                 * @return {Dom} $emptyText
                 */
                $getEmptyText(): Dom {
                    if (this.$emptyText === undefined) {
                        this.$emptyText = Html.create('div', { 'data-role': 'empty' });
                    }

                    return this.$emptyText;
                }

                /**
                 * 버튼 DOM 을 가져온다.
                 *
                 * @return {Dom} $button
                 */
                $getButton(): Dom {
                    if (this.$button === undefined) {
                        this.$button = Html.create('button', {
                            type: 'button',
                            class: 'mi mi-calendar-dates',
                        });
                        this.$button.on('pointerdown', (e: PointerEvent) => {
                            if (this.isExpand() == true) {
                                this.collapse();
                            } else {
                                this.expand();
                            }

                            e.stopImmediatePropagation();
                        });
                    }

                    return this.$button;
                }

                /**
                 * placeHolder 문자열을 설정한다.
                 *
                 * @param {string} emptyText - placeHolder (NULL 인 경우 표시하지 않음)
                 */
                setEmptyText(emptyText: string = null): void {
                    this.emptyText = emptyText === null || emptyText.length == 0 ? null : emptyText;

                    if (this.isRendered() == true) {
                        this.updateLayout();
                    }
                }

                /**
                 * 필드 비활성화여부를 설정한다.
                 *
                 * @param {boolean} disabled - 비활성여부
                 * @return {Aui.Form.Field.TextArea} this
                 */
                setDisabled(disabled: boolean): this {
                    if (disabled == true) {
                        this.$getInput().setAttr('disabled', 'disabled');
                        this.$getButton().setAttr('disabled', 'disabled');
                    } else {
                        this.$getInput().removeAttr('disabled');
                        this.$getButton().removeAttr('disabled');
                    }

                    super.setDisabled(disabled);

                    return this;
                }

                /**
                 * 캘린더를 표시한다.
                 */
                expand(): void {
                    this.getCalendar().setValue(this.value);
                    this.getAbsolute().show();
                }

                /**
                 * 캘린더를 숨긴다.
                 */
                collapse(): void {
                    this.getAbsolute().hide();
                }

                /**
                 * 캘린더가 보이는 상태인지 확인한다.
                 *
                 * @return {boolean} isExpand
                 */
                isExpand(): boolean {
                    return this.getAbsolute().isShow();
                }

                /**
                 * 필드에 포커스를 지정한다.
                 */
                focus(): void {
                    this.$getInput().focus();
                }

                /**
                 * 필드에 포커스를 해제한다.
                 */
                blur(): void {
                    this.$getInput().blur();
                }

                /**
                 * 필드의 키보드 이벤트를 처리한다.
                 *
                 * @param {KeyboardEvent} e
                 */
                keydown(e: KeyboardEvent): void {
                    this.fireEvent('keydown', [this, e]);
                }

                /**
                 * 필드의 키보드 이벤트를 처리한다.
                 *
                 * @param {KeyboardEvent} e
                 */
                enter(e: KeyboardEvent): void {
                    this.fireEvent('enter', [this, this.getValue(), e]);
                }

                /**
                 * 필드값을 지정한다.
                 *
                 * @param {any} value - 값
                 * @param {boolean} is_origin - 원본값 변경여부
                 */
                setValue(value: any, is_origin: boolean = false): void {
                    if (typeof value == 'string') {
                        if (moment(value).isValid() == true) {
                            this.value = moment(value);
                        } else {
                            this.value = null;
                        }
                    } else if (value instanceof moment) {
                        this.value = value;
                    }

                    if (this.value === null) {
                        this.$getInput().setValue('');
                        this.$getEmptyText().show();
                    } else {
                        this.$getInput().setValue(Format.date(this.displayFormat, this.value, null, false));
                        this.$getEmptyText().hide();
                    }

                    this.setError(false);
                    super.setValue(this.value, is_origin);
                }

                /**
                 * 필드값을 가져온다.
                 *
                 * @return {string} value
                 */
                getValue(): string {
                    if (this.value instanceof moment) {
                        return Format.date(this.format, this.value, null, false);
                    }

                    return null;
                }

                /**
                 * moment 값을 가져온다.
                 *
                 * @return {Object} momentValue
                 */
                getRawValue(): Object {
                    if (this.value instanceof moment) {
                        return this.value;
                    }

                    return null;
                }

                /**
                 * INPUT 태그를 랜더링한다.
                 */
                renderContent(): void {
                    const $input = this.$getInput();
                    this.$getContent().append($input);

                    const $button = this.$getButton();
                    this.$getContent().append($button);
                }

                /**
                 * 필드 레이아웃을 업데이트한다.
                 */
                updateLayout(): void {
                    super.updateLayout();

                    if (this.properties.emptyText !== null) {
                        const $emptyText = this.$getEmptyText();
                        $emptyText.html(this.emptyText);
                        this.$getContent().append($emptyText);
                    } else {
                        this.$getEmptyText().remove();
                    }
                }
            }

            export namespace Date {
                export namespace Calendar {
                    export interface Listeners extends Aui.Component.Listeners {
                        /**
                         * @type {Function} change - 선택 날짜가 변경되었을 때
                         */
                        change?: (value: any) => void;
                    }
                    export interface Properties extends Aui.Component.Properties {
                        listeners?: Aui.Form.Field.Date.Calendar.Listeners;
                    }
                }

                export class Calendar extends Aui.Component {
                    type: string = 'form';
                    role: string = 'calendar';

                    $month: Dom;
                    current: string;

                    spinTimeout: number;

                    /**
                     * 캘린더를 생성한다.
                     *
                     * @param {Aui.Form.Field.Date.Calendar.Properties} properties - 객체설정
                     */
                    constructor(properties: Aui.Form.Field.Date.Calendar.Properties = null) {
                        super(properties);

                        this.current = this.properties.current ?? moment().format('YYYY-MM-DD');

                        this.$setTop();
                        this.$setBottom();
                    }

                    /**
                     * 설정된 현재 날짜를 moment 객체로 변경한다.
                     *
                     * @return {any} date
                     */
                    getCurrent(): any {
                        return moment(this.current);
                    }

                    /**
                     * 현재 월 버튼 DOM 을 가져온다.
                     *
                     * @return {Dom} $month
                     */
                    $getMonth(): Dom {
                        if (this.$month === undefined) {
                            this.$month = Html.create(
                                'button',
                                { type: 'button', 'data-action': 'month' },
                                this.getCurrent().format('YYYY.MM')
                            );
                        }

                        return this.$month;
                    }

                    /**
                     * 이전달로 이동한다.
                     */
                    prevMonth(): void {
                        const month = moment(this.$getContent().getData('month'));
                        const prev = month.add(-1, 'month');

                        this.renderCalendar(prev);
                    }

                    /**
                     * 다음달로 이동한다.
                     */
                    nextMonth(): void {
                        const month = moment(this.$getContent().getData('month'));
                        const next = month.add(1, 'month');

                        this.renderCalendar(next);
                    }

                    /**
                     * 달을 이동한다.
                     *
                     * @param {string} direction - 이동할 방향
                     * @param {boolean} is_interval - 지속이동여부
                     */
                    startSpin(direction: string, is_interval: boolean = false): void {
                        this.stopSpin();
                        if (direction == 'prev') {
                            this.prevMonth();
                        } else {
                            this.nextMonth();
                        }

                        this.spinTimeout = setTimeout(
                            this.startSpin.bind(this),
                            is_interval == true ? 100 : 500,
                            direction,
                            true
                        );
                    }

                    /**
                     * 달 이동을 중단한다.
                     */
                    stopSpin(): void {
                        if (this.spinTimeout) {
                            clearTimeout(this.spinTimeout);
                            this.spinTimeout = null;
                        }
                    }

                    /**
                     * 날짜를 선택한다.
                     *
                     * @param {any} date
                     */
                    setValue(date: any): void {
                        if (typeof date == 'string' && moment(date).isValid() == true) {
                            date = moment(date);
                        } else if (date instanceof moment) {
                        } else {
                            date = moment();
                        }

                        this.fireEvent('change', [date]);

                        this.current = date.format('YYYY-MM-DD');
                        this.renderContent();
                    }

                    /**
                     * 년월 선택영역을 랜더링한다.
                     */
                    renderTop(): void {
                        const $prev = Html.create('button', { type: 'button', 'data-action': 'prev' });
                        this.$getTop().append($prev);
                        $prev.on('mousedown', () => {
                            this.startSpin('prev');
                        });
                        $prev.on('mouseup', () => {
                            this.stopSpin();
                        });
                        $prev.on('mouseout', () => {
                            this.stopSpin();
                        });

                        const $month = this.$getMonth();
                        this.$getTop().append($month);

                        const $next = Html.create('button', { type: 'button', 'data-action': 'next' });
                        $next.on('mousedown', () => {
                            this.startSpin('next');
                        });
                        $next.on('mouseup', () => {
                            this.stopSpin();
                        });
                        $next.on('mouseout', () => {
                            this.stopSpin();
                        });
                        this.$getTop().append($next);
                    }

                    /**
                     * 캘린더를 랜더링한다.
                     */
                    renderContent(): void {
                        this.renderCalendar();
                    }

                    /**
                     * 오늘 선택버튼을 랜더링한다.
                     */
                    renderBottom(): void {
                        const $button = Html.create('button', { type: 'button' });

                        this.$getBottom().append($button);
                        $button.html(Aui.printText('components.form.calendar.today'));
                        $button.on('click', () => {
                            const today = moment();
                            this.renderCalendar(today);
                        });
                    }

                    /**
                     * 캘린더를 랜더링한다.
                     */
                    renderCalendar(month: any = null): void {
                        month ??= this.getCurrent();
                        this.$getMonth().html(month.format('YYYY.MM'));
                        this.$getContent().setData('month', month.format('YYYY-MM-DD'), false);
                        this.$getContent().empty();

                        const $days = Html.create('ul', { 'data-role': 'days' });
                        const firstDate = month.set('date', 1);
                        const startDay = firstDate.format('e');
                        const startDate = firstDate.clone().add(startDay * -1, 'd');

                        for (let i = 0; i < 7; i++) {
                            const date = startDate.clone().add(i, 'd');
                            const $day = Html.create('li', { 'data-day': date.format('dd') });
                            $day.html(date.locale(Aui.getLanguage()).format('dd'));
                            $days.append($day);
                        }
                        this.$getContent().append($days);

                        const $dates = Html.create('ul', { 'data-role': 'dates' });
                        for (let i = 0; i < 42; i++) {
                            const date = startDate.clone().add(i, 'd');

                            const $date = Html.create('li', { 'data-day': date.format('dd') });
                            if (date.month() != firstDate.month()) {
                                $date.addClass('disabled');
                            }

                            if (date.format('YYYY-MM-DD') == moment().format('YYYY-MM-DD')) {
                                $date.addClass('today');
                            }

                            if (this.getCurrent().format('YYYY-MM-DD') == date.format('YYYY-MM-DD')) {
                                $date.addClass('selected');
                            }

                            $date.html(date.format('D'));

                            $date.on('click', () => {
                                this.setValue(date);
                            });

                            $dates.append($date);
                        }
                        this.$getContent().append($dates);
                    }
                }
            }

            export class Password extends Aui.Form.Field.Text {
                inputType: string = 'password';
            }

            export namespace Search {
                export interface Properties extends Aui.Form.Field.Base.Properties {
                    /**
                     * @type {boolean} liveSearch - 실시간 검색을 실행할지 여부
                     */
                    liveSearch?: boolean;

                    /**
                     * @type {Function} handler - 검색을 시행할 함수
                     */
                    handler?: (keyword: string, field: Aui.Form.Field.Search) => Promise<void>;
                }
            }

            export class Search extends Aui.Form.Field.Text {
                inputType: string = 'search';

                liveSearch: boolean;
                handler: (keyword: string, field: Aui.Form.Field.Search) => Promise<void>;
                $button: Dom;

                searching: boolean = false;
                lastKeyword: string = null;

                /**
                 * 검색필드 클래스 생성한다.
                 *
                 * @param {Aui.Form.Field.Search.Properties} properties - 객체설정
                 */
                constructor(properties: Aui.Form.Field.Search.Properties = null) {
                    super(properties);

                    this.liveSearch = this.properties.liveSearch === true;
                    this.handler = this.properties.handler ?? null;
                }

                /**
                 * INPUT 필드 DOM 을 가져온다.
                 *
                 * @return {Dom} $input
                 */
                $getInput(): Dom {
                    if (this.$input === undefined) {
                        this.$input = Html.create('input', {
                            type: this.inputType,
                            name: this.inputName,
                        });

                        this.$input.on('input', (e: InputEvent) => {
                            const input = e.currentTarget as HTMLInputElement;
                            this.setValue(input.value);
                            if (this.liveSearch == true) {
                                this.search();
                            }
                        });

                        this.$input.on('keydown', (e: KeyboardEvent) => {
                            if (e.key == 'Enter') {
                                this.search();
                                e.preventDefault();
                                e.stopImmediatePropagation();
                            }
                        });
                    }

                    return this.$input;
                }

                /**
                 * 검색버튼 DOM 을 가져온다.
                 *
                 * @return {Dom} $searchButton
                 */
                $getButton(): Dom {
                    if (this.$button === undefined) {
                        this.$button = Html.create('button', {
                            type: 'button',
                            'data-action': 'search',
                        });
                        this.$button.html('<i></i>');

                        this.$button.on('click', (e: MouseEvent) => {
                            this.search();
                            e.preventDefault();
                            e.stopImmediatePropagation();
                        });
                    }

                    return this.$button;
                }

                /**
                 * 검색을 시작한다.
                 */
                async search(is_reset: boolean = false): Promise<void> {
                    if (this.searching == true) {
                        return;
                    }

                    const keyword = this.getValue();
                    if (this.lastKeyword == keyword) {
                        if (is_reset == true) {
                            this.lastKeyword = null;
                        }
                        return;
                    }

                    this.searching = true;
                    this.lastKeyword = keyword;
                    if (this.handler !== null) {
                        await this.handler(keyword, this);
                        this.searching = false;
                        this.search(true);
                    }
                }

                /**
                 * 필드에 포커스를 지정한다.
                 */
                focus(): void {
                    this.$getInput().focus();
                }

                /**
                 * 필드에 포커스를 해제한다.
                 */
                blur(): void {
                    this.$getInput().blur();
                }

                /**
                 * INPUT 태그를 랜더링한다.
                 */
                renderContent(): void {
                    const $input = this.$getInput();
                    this.$getContent().append($input);

                    const $button = this.$getButton();
                    this.$getContent().append($button);
                }
            }

            export namespace Color {
                export interface Properties extends Aui.Form.Field.Base.Properties {
                    //
                }
            }

            export class Color extends Aui.Form.Field.Text {
                inputType: string = 'color';

                $button: Dom;
                $preview: Dom;

                /**
                 * 색상필드 클래스 생성한다.
                 *
                 * @param {Aui.Form.Field.Color.Properties} properties - 객체설정
                 */
                constructor(properties: Aui.Form.Field.Color.Properties = null) {
                    super(properties);
                }

                /**
                 * INPUT 필드 DOM 을 가져온다.
                 *
                 * @return {Dom} $input
                 */
                $getInput(): Dom {
                    if (this.$input === undefined) {
                        this.$input = Html.create('input', {
                            type: 'text',
                            name: this.inputName,
                        });

                        this.$input.on('input', (e: InputEvent) => {
                            const input = e.currentTarget as HTMLInputElement;
                            this.setValue(input.value);
                        });
                    }

                    return this.$input;
                }

                /**
                 * 컬러픽커버튼 DOM 을 가져온다.
                 *
                 * @return {Dom} $searchButton
                 */
                $getButton(): Dom {
                    if (this.$button === undefined) {
                        this.$button = Html.create('input', {
                            type: 'color',
                        });

                        this.$button.on('input', (e: InputEvent) => {
                            this.setValue((e.currentTarget as HTMLInputElement).value);
                        });
                    }

                    return this.$button;
                }

                /**
                 * 색상미리보기 필드 DOM 을 가져온다.
                 *
                 * @return {Dom} $input
                 */
                $getPreview(): Dom {
                    if (this.$preview === undefined) {
                        this.$preview = Html.create('i', { 'data-role': 'preview' });
                    }

                    return this.$preview;
                }

                /**
                 * 필드에 포커스를 지정한다.
                 */
                focus(): void {
                    this.$getInput().focus();
                }

                /**
                 * 필드에 포커스를 해제한다.
                 */
                blur(): void {
                    this.$getInput().blur();
                }

                /**
                 * 필드값을 지정한다.
                 *
                 * @param {any} value - 값
                 * @param {boolean} is_origin - 원본값 변경여부
                 */
                setValue(value: any, is_origin?: boolean): void {
                    if (value !== null && value.length > 0 && value.search(/^#[a-zA-Z0-9]{6}$/) === -1) {
                        this.setError(true);
                    } else {
                        this.setError(false);

                        if (value !== null) {
                            value = value.toLowerCase();
                        }
                        this.$getPreview().setStyle('background', value);
                        this.$getButton().setValue(value);
                    }

                    super.setValue(value, is_origin);
                }

                /**
                 * 필드값이 유효한지 확인한다.
                 *
                 * @return {boolean|string} validation
                 */
                async validate(): Promise<boolean | string> {
                    if (this.allowBlank === false && this.isBlank() == true) {
                        return Aui.getErrorText('REQUIRED');
                    }

                    if (typeof this.validator == 'function') {
                        return await this.validator(this.getValue(), this);
                    }

                    if (this.getValue() !== null && this.getValue().length > 0) {
                        if (this.getValue().search(/^#[a-zA-Z0-9]{6}$/) === -1) {
                            return Aui.getErrorText('INVALID_COLOR_CODE');
                        }
                    }

                    return true;
                }

                /**
                 * INPUT 태그를 랜더링한다.
                 */
                renderContent(): void {
                    const $input = this.$getInput();
                    this.$getContent().append($input);

                    const $button = this.$getButton();
                    this.$getContent().append($button);

                    const $preview = this.$getPreview();
                    this.$getContent().append($preview);
                }
            }

            export namespace Number {
                export interface Properties extends Aui.Form.Field.Text.Properties {
                    /**
                     * @type {boolean} spinner - 숫자조절 버튼을 보일지 여부
                     */
                    spinner?: boolean;

                    /**
                     * @type {boolean} spinner - 숫자입력시 숫자포맷을 적용할 지여부
                     */
                    format?: boolean;

                    /**
                     * @type {string} spinner - 숫자포맷을 적용할 지역코드
                     */
                    locale?: string;
                }
            }

            export class Number extends Aui.Form.Field.Text {
                inputType: string = 'text';

                step: number;
                minValue: number;
                maxValue: number;
                spinner: boolean;
                format: boolean;
                locale: string;

                $spinner: Dom;

                editable: boolean;
                spinTimeout: number;

                /**
                 * 숫자필드 클래스 생성한다.
                 *
                 * @param {Aui.Form.Field.Number.Properties} properties - 객체설정
                 */
                constructor(properties: Aui.Form.Field.Number.Properties = null) {
                    super(properties);

                    this.spinner = this.properties.spinner === true;
                    this.format = this.properties.format === true;
                    this.locale = this.properties.locale ?? Html.get('html').getAttr('lang') ?? 'ko';
                    this.inputAlign = this.properties.inputAlign ?? 'right';
                    this.step = this.properties.step ?? 1;
                    this.minValue = this.properties.minValue ?? null;
                    this.maxValue = this.properties.maxValue ?? null;
                    this.editable = this.properties.editable !== false;
                    this.value = this.localeStringToFloat(this.properties.value) ?? null;
                }

                /**
                 * INPUT 필드 DOM 을 가져온다.
                 *
                 * @return {Dom} $input
                 */
                $getInput(): Dom {
                    if (this.$input === undefined) {
                        this.$input = Html.create('input', {
                            type: this.inputType,
                            name: this.inputName,
                            step: this.step.toString(),
                            value:
                                this.format == true
                                    ? Format.number(this.value ?? 0, this.locale)
                                    : this.value?.toString() ?? '0',
                        });
                        this.$input.setStyle('text-align', this.inputAlign);
                        if (this.readonly == true || this.editable == false) {
                            this.$input.setAttr('readonly', 'readonly');
                        }
                        this.$input.setData('renderer', true);

                        this.$input.on('input', (e: InputEvent) => {
                            const input = e.currentTarget as HTMLInputElement;

                            if (input.value.endsWith('.') == false && input.value.endsWith(',') == false) {
                                this.setValue(input.value);
                            }
                        });

                        this.$input.on('keydown', (e: KeyboardEvent) => {
                            if (
                                e.key == 'Backspace' ||
                                e.key == 'Tab' ||
                                e.key == 'Delete' ||
                                e.key.search(/Arrow/) > -1 ||
                                e.metaKey == true ||
                                e.ctrlKey == true
                            ) {
                                return;
                            }

                            if (e.key.search(/[0-9\.,]/) == -1) {
                                e.preventDefault();
                            }

                            if (e.key == 'Enter') {
                                this.enter(e);
                            }

                            this.keydown(e);
                        });
                    }

                    return this.$input;
                }

                /**
                 * 마우스가 활성화된 동안 지속해서 값을 변경한다.
                 *
                 * @param {number} step - 변경할 단계
                 */
                startSpin(step: number, is_interval: boolean = false): void {
                    this.stopSpin();
                    this.doStep(step);
                    this.spinTimeout = setTimeout(
                        this.startSpin.bind(this),
                        is_interval == true ? 100 : 500,
                        step,
                        true
                    );
                }

                /**
                 * 값 변경을 중단한다.
                 */
                stopSpin(): void {
                    if (this.spinTimeout) {
                        clearTimeout(this.spinTimeout);
                        this.spinTimeout = null;
                    }
                }

                /**
                 * 값을 변경한다.
                 *
                 * @param {number} step - 변경할 단계
                 */
                doStep(step: number): void {
                    const value = parseInt(this.$getInput().getValue(), 10);
                    let change = value + step;
                    if (this.minValue !== null) {
                        change = Math.max(this.minValue, change);
                    }

                    if (this.maxValue !== null) {
                        change = Math.min(this.maxValue, change);
                    }

                    this.setValue(change);
                }

                /**
                 * 스피너를 가져온다.
                 *
                 * @return {Dom} $spinner
                 */
                $getSpinner(): Dom {
                    if (this.$spinner === undefined) {
                        this.$spinner = Html.create('div', { 'data-role': 'spinner' });
                        const $increase = Html.create('button', {
                            type: 'button',
                            'data-direction': 'increase',
                            'tabindex': '-1',
                        });
                        $increase.html('<i></i>');
                        this.$spinner.append($increase);
                        $increase.on('mousedown', () => {
                            this.startSpin(this.step);
                        });
                        $increase.on('mouseup', () => {
                            this.stopSpin();
                        });
                        $increase.on('mouseout', () => {
                            this.stopSpin();
                        });

                        const $decrease = Html.create('button', {
                            type: 'button',
                            'data-direction': 'decrease',
                            'tabindex': '-1',
                        });
                        $decrease.html('<i></i>');
                        $decrease.on('mousedown', () => {
                            this.startSpin(this.step * -1);
                        });
                        $decrease.on('mouseup', () => {
                            this.stopSpin();
                        });
                        $decrease.on('mouseout', () => {
                            this.stopSpin();
                        });
                        this.$spinner.append($decrease);
                    }

                    return this.$spinner;
                }

                /**
                 * 포맷팅된 숫자문자열을 숫자로 변환한다.
                 *
                 * @param {string|number} number - 포맷팅된 숫자
                 * @return {number} number
                 */
                localeStringToFloat(number: string | number): number {
                    if (typeof number == 'number') {
                        number = number.toString();
                    }

                    if ((number?.length ?? 0) == 0) {
                        return 0;
                    }

                    const parts = (1234.5).toLocaleString(this.locale).match(/(\D+)/g);
                    let unformatted = number;

                    if (parts) {
                        unformatted = unformatted.split(parts[0]).join('');
                        unformatted = unformatted.split(parts[1]).join('.');
                        return parseFloat(unformatted);
                    }

                    return parseFloat(number);
                }

                /**
                 * 필드에 포커스를 지정한다.
                 */
                focus(): void {
                    this.$getInput().focus();
                }

                /**
                 * 필드에 포커스를 해제한다.
                 */
                blur(): void {
                    this.$getInput().blur();
                }

                /**
                 * 필드값을 가져온다.
                 *
                 * @return {number} value
                 */
                getValue(): number {
                    return this.localeStringToFloat(this.value);
                }

                /**
                 * 필드값을 지정한다.
                 *
                 * @param {number|string} value - 값
                 * @param {boolean} is_origin - 원본값 변경여부
                 */
                setValue(value: number | string, is_origin: boolean = false): void {
                    if (typeof value == 'string') {
                        value = this.localeStringToFloat(value);
                    }

                    if (typeof value != 'number' || isNaN(value) == true) {
                        return;
                    }

                    if (this.minValue !== null) {
                        value = Math.max(this.minValue, value);
                    }

                    if (this.maxValue !== null) {
                        value = Math.min(this.maxValue, value);
                    }

                    if (this.format == true) {
                        this.$getInput().setValue(Format.number(value, this.locale));
                    } else {
                        this.$getInput().setValue(value.toString());
                    }

                    super.setValue(value, is_origin);
                }

                /**
                 * 필드셋 비활성화여부를 설정한다.
                 *
                 * @param {boolean} disabled - 비활성화여부
                 * @return {this} this
                 */
                setDisabled(disabled: boolean): this {
                    if (disabled == true) {
                        Html.all('button', this.$getSpinner()).setAttr('disabled', 'disabled');
                    } else {
                        Html.all('button', this.$getSpinner()).removeAttr('disabled');
                    }

                    super.setDisabled(disabled);

                    return this;
                }

                /**
                 * 최소값을 설정한다.
                 *
                 * @param {number} minValue
                 */
                setMinValue(minValue: number): void {
                    this.minValue = minValue;

                    if (this.minValue === null) {
                        this.$getInput().removeAttr('min');
                    } else {
                        this.$getInput().setAttr('min', this.minValue.toString());
                    }
                }

                /**
                 * 최대값을 설정한다.
                 *
                 * @param {number} maxValue
                 */
                setMaxValue(maxValue: number): void {
                    this.maxValue = maxValue;

                    if (this.maxValue === null) {
                        this.$getInput().removeAttr('max');
                    } else {
                        this.$getInput().setAttr('max', this.maxValue.toString());
                    }
                }

                /**
                 * INPUT 태그를 랜더링한다.
                 */
                renderContent(): void {
                    const $input = this.$getInput();
                    this.$getContent().append($input);
                    if (this.spinner == true || this.editable == false) {
                        this.$getContent().append(this.$getSpinner());
                    }
                }

                /**
                 * 필드를 랜더링한다.
                 */
                render(): void {
                    super.render();

                    if (this.minValue !== null) {
                        this.setMinValue(this.minValue);
                    }

                    if (this.maxValue !== null) {
                        this.setMaxValue(this.maxValue);
                    }

                    if (this.editable == false) {
                        this.$getContent().setAttr('data-editable', 'false');
                    }
                }
            }

            export namespace Display {
                export interface Properties extends Aui.Form.Field.Base.Properties {
                    /**
                     * @type {string} textAlign - 필드 정렬
                     */
                    textAlign?: string;

                    /**
                     * @type {string} textClass - 필드 스타일시트
                     */
                    textClass?: string;

                    /**
                     * @type {boolean} textWrap - 텍스트 줄바꿈여부
                     */
                    textWrap?: boolean;

                    /**
                     * @type {Function} renderer - 필드 랜더러
                     */
                    renderer?: (value: any, field: Aui.Form.Field.Display) => string;
                }
            }

            export class Display extends Aui.Form.Field.Base {
                field: string = 'display';

                textAlign: string;
                textClass: string;
                textWrap: boolean;
                renderer: (value: string, field: Aui.Form.Field.Display) => string;
                $display: Dom;

                /**
                 * 디스플레이필드 클래스 생성한다.
                 *
                 * @param {Object} properties - 객체설정
                 */
                constructor(properties: Aui.Form.Field.Display.Properties = null) {
                    super(properties);

                    this.textAlign = this.properties.textAlign ?? 'left';
                    this.textClass = this.properties.textClass ?? null;
                    this.textWrap = this.properties.textWrap !== false;
                    this.renderer = this.properties.renderer ?? null;
                    this.value = this.properties.value ?? null;
                }

                /**
                 * DISPLAY 필드 DOM 을 가져온다.
                 *
                 * @return {Dom} $display
                 */
                $getDisplay(): Dom {
                    if (this.$display === undefined) {
                        this.$display = Html.create('div');
                        this.$display.setStyle('text-align', this.textAlign);

                        if (this.textWrap == false) {
                            this.$display.addClass('nowrap');
                        }

                        if (this.textClass !== null) {
                            this.$display.addClass(...this.textClass.split(' '));
                        }
                    }

                    return this.$display;
                }

                /**
                 * 필드값을 지정한다.
                 *
                 * @param {any} value - 값
                 * @param {boolean} is_origin - 원본값 변경여부
                 */
                setValue(value: any, is_origin: boolean = false): void {
                    if (this.renderer === null) {
                        this.$getDisplay().html((value ?? this.value)?.toString() ?? '');
                    } else {
                        this.$getDisplay().html(this.renderer(value, this));
                    }
                    super.setValue(value, is_origin);
                }

                /**
                 * DISPLAY 태그를 랜더링한다.
                 */
                renderContent(): void {
                    const $display = this.$getDisplay();
                    this.$getContent().append($display);
                    this.setValue(this.value ?? null);
                }
            }

            export namespace Tags {
                export interface Properties extends Aui.Form.Field.Base.Properties {
                    /**
                     * @type {string} store - 태그탐색 Store
                     */
                    store?: Aui.Store;

                    /**
                     * @type {string} tagField - 태그값을 표시할 store 의 field 명
                     */
                    tagField?: string;

                    /**
                     * @type {string} listField - 태그목록 항목에 표시할 store 의 field 명
                     */
                    listField?: string;

                    /**
                     * @type {Function} renderer - 목록 항목을 보일 때 사용할 렌더링 함수
                     */
                    listRenderer?: (display: string, record: Aui.Data.Record, $dom: Dom) => string;
                }
            }

            export class Tags extends Aui.Form.Field.Base {
                field: string = 'tags';

                absolute: Aui.Absolute;
                list: Aui.Grid.Panel;
                store: Aui.Store.Remote;
                tagField: string;
                listField: string;

                listRenderer: (display: string, record: Aui.Data.Record, $dom: Dom) => string;

                url: string;
                $tags: Dom;
                $input: Dom;

                /**
                 * 태그 클래스 생성한다.
                 *
                 * @param {Aui.Form.Field.Tags.Properties} properties - 객체설정
                 */
                constructor(properties: Aui.Form.Field.Tags.Properties = null) {
                    super(properties);

                    this.store = this.properties.store ?? null;
                    this.tagField = this.properties.tagField ?? 'tag';
                    this.listField = this.properties.listField ?? this.tagField;
                    this.listRenderer = this.properties.listRenderer ?? null;
                }

                /**
                 * 절대위치 목록 컴포넌트를 가져온다.
                 *
                 * @return {Aui.Absolute} absolute
                 */
                getAbsolute(): Aui.Absolute {
                    if (this.store === null) {
                        return null;
                    }

                    if (this.absolute === undefined) {
                        this.absolute = new Aui.Absolute({
                            $target: this.$getInput(),
                            items: [this.getList()],
                            direction: 'y',
                            hideOnClick: true,
                            parent: this,
                            listeners: {
                                render: () => {
                                    this.getAbsolute()
                                        .$getContainer()
                                        .setStyle('border-color', 'var(--input-border-color-focus)');
                                },
                                show: () => {
                                    this.getList().setMaxWidth(null);
                                    this.getList().setMaxHeight(null);
                                    this.getAbsolute().updatePosition();
                                    this.getList().setMaxWidth(this.getAbsolute().getPosition().maxWidth - 2);
                                    this.getList().setMaxHeight(this.getAbsolute().getPosition().maxHeight - 2);
                                    this.$getContent().addClass('expand');
                                },
                                hide: () => {
                                    this.$getContent().removeClass('expand');
                                },
                            },
                        });
                    }

                    return this.absolute;
                }

                /**
                 * 목록 컴포넌트를 가져온다.
                 *
                 * @return {Aui.Grid.Panel} list
                 */
                getList(): Aui.Grid.Panel {
                    if (this.store === null) {
                        return null;
                    }

                    if (this.list === undefined) {
                        this.list = new Aui.Grid.Panel({
                            store: this.properties.store,
                            parent: this,
                            selection: { selectable: true },
                            columnHeaders: false,
                            rowLines: false,
                            border: false,
                            columns: [
                                {
                                    text: 'display',
                                    dataIndex: this.listField,
                                    flex: 1,
                                    renderer: (value: any, record: Aui.Data.Record, $dom: Dom) => {
                                        if (this.listRenderer !== null) {
                                            return this.listRenderer(value, record, $dom);
                                        } else {
                                            return value;
                                        }
                                    },
                                },
                            ],
                            class: 'tags',
                            listeners: {
                                beforeLoad: () => {
                                    this.getList().setHeight(80);
                                },
                                update: () => {
                                    if (this.getList().getStore().isLoaded() == true) {
                                        this.getAbsolute().setVisibility(this.getList().getStore().getCount() == 0);
                                    }
                                    this.getList().setMaxWidth(null);
                                    this.getList().setMaxHeight(null);
                                    this.getAbsolute().updatePosition();
                                    this.getList().setHeight(null);
                                    this.getList().setMaxWidth(this.getAbsolute().getPosition().maxWidth - 2);
                                    this.getList().setMaxHeight(this.getAbsolute().getPosition().maxHeight - 2);
                                },
                                focusMove: (_rowIndex, _columnIndex, _value, record) => {
                                    this.$getInput().setValue(record.get(this.tagField));
                                },
                                selectionChange: (selections: Aui.Data.Record[]) => {
                                    if (selections.length == 1) {
                                        this.addTag(selections[0].get(this.tagField));
                                    }
                                },
                                selectionComplete: () => {
                                    this.collapse();
                                },
                            },
                        });
                    }
                    return this.list;
                }

                /**
                 * 데이터스토어를 가져온다.
                 *
                 * @return {Aui.Store} store
                 */
                getStore(): Aui.Store {
                    return this.getList()?.getStore() ?? null;
                }

                /**
                 * 태그 입력 DOM 을 가져온다.
                 *
                 * @return {Dom} $tags
                 */
                $getTags(): Dom {
                    if (this.$tags === undefined) {
                        this.$tags = Html.create('div', { 'data-role': 'tags' });
                    }

                    return this.$tags;
                }

                /**
                 * 태그 DOM 을 가져온다.
                 *
                 * @param {string} tag - 태그
                 * @return {Dom} $tag
                 */
                $getTag(tag: string): Dom {
                    const $tag = Html.create('div', { 'data-role': 'tag' });
                    $tag.setData('tag', tag, false);
                    const $span = Html.create('span').html(tag);
                    $span.on('click', () => {
                        $tag.append(this.$getInput());
                        this.$getInput().setValue($tag.getData('tag'));
                        this.$getInput().focus();
                    });
                    $tag.append($span);

                    const $button = Html.create('button', { type: 'button' });
                    $button.on('click', () => {
                        $tag.remove();
                        this.updateValue();
                    });
                    $tag.append($button);

                    return $tag;
                }

                /**
                 * 태그 INPUT DOM 을 가져온다.
                 *
                 * @return {Dom} $input
                 */
                $getInput(): Dom {
                    if (this.$input === undefined) {
                        this.$input = Html.create('input', { type: 'text' });
                        this.$input.on('keydown', (e: KeyboardEvent) => {
                            if (e.key == ' ' || e.key == '#') {
                                e.preventDefault();
                            }

                            if (e.key == 'Tab' || e.key == ',' || e.key == 'Enter') {
                                this.collapse();
                                const value = this.$input.getValue();
                                if (value.length > 0) {
                                    const $parent = this.$input.getParent();
                                    if ($parent.getAttr('data-role') == 'tags') {
                                        this.addTag(value);
                                    } else {
                                        this.setTag($parent, value, 'next');
                                    }
                                    this.$input.focus();

                                    e.preventDefault();
                                }

                                if (e.key == ',') {
                                    e.preventDefault();
                                }
                            }

                            if (e.key == 'ArrowDown' || e.key == 'ArrowUp') {
                                if (this.isExpand() == false) {
                                    this.expand();
                                }
                                this.getList().$getComponent().getEl().dispatchEvent(new KeyboardEvent('keydown', e));
                                e.stopPropagation();
                            }

                            if (e.key == 'Escape') {
                                if (this.isExpand() == true) {
                                    this.collapse();
                                    e.preventDefault();
                                    e.stopPropagation();
                                }
                            }
                        });

                        this.$input.on('input', () => {
                            if (this.getAbsolute()?.isShow() === false) {
                                this.expand();
                            }

                            this.getStore().setFilter(this.tagField, this.$getInput().getValue(), 'likecode');
                        });

                        this.$input.on('blur', () => {
                            this.collapse();
                            const value = this.$input.getValue();
                            if (value.length > 0) {
                                const $parent = this.$input.getParent();
                                if ($parent.getAttr('data-role') == 'tags') {
                                    this.addTag(value);
                                } else {
                                    this.setTag($parent, value, 'last');
                                }
                            }

                            if (this.$getTags().getChildren().length - 1 != this.$input.getIndex()) {
                                this.$getTags().append(this.$input);
                                this.$input.focus();
                            }
                        });
                    }

                    return this.$input;
                }

                /**
                 * 태그를 추가한다.
                 *
                 * @param {string} tag - 추가할 태그
                 */
                addTag(tag: string): void {
                    const index = this.$getInput().getIndex();
                    const $tag = this.$getTag(tag);
                    this.$getInput().setValue('');
                    this.$getTags().append($tag, index);
                    this.updateValue();
                }

                /**
                 * 기존 태그를 수정한다.
                 *
                 * @param {Dom} $dom - 수정할 태그 DOM 객체
                 * @param {string} tag - 태그명
                 * @param {'last'|'next'} position - 수정 후 INPUT 위치
                 */
                setTag($dom: Dom, tag: string, position: 'last' | 'next' = 'last'): void {
                    const index = $dom.getIndex();
                    this.$getInput().setValue('');

                    if (position == 'last') {
                        this.$getTags().append(this.$getInput());
                    } else {
                        this.$getTags().append(this.$getInput(), index + 1);
                    }
                    $dom.replaceWith(this.$getTag(tag));
                    this.updateValue();
                }

                /**
                 * 선택목록을 확장한다.
                 */
                expand(): void {
                    this.getAbsolute()?.show();
                }

                /**
                 * 선택목록을 최소화한다.
                 */
                collapse(): void {
                    this.getList()?.deselectAll();
                    this.getStore().resetFilters();
                    this.getAbsolute()?.hide();
                }

                /**
                 * 선택목록이 확장되어 있는지 확인한다.
                 *
                 * @return {boolean} isExpand
                 */
                isExpand(): boolean {
                    return this.getAbsolute()?.isShow() ?? false;
                }

                /**
                 * 필드값을 지정한다.
                 *
                 * @param {string[]} value - 값
                 * @param {boolean} is_origin - 원본값 변경여부
                 */
                setValue(value: string[], is_origin: boolean = false): void {
                    if (Array.isArray(value) == false) {
                        value = null;
                    }

                    for (const tag of value ?? []) {
                        this.addTag(tag);
                    }
                    super.setValue(value, is_origin);
                }

                /**
                 * 필드값을 가져온다.
                 *
                 * @return {any} value - 값
                 */
                getValue(): any {
                    const value = [];
                    Html.all('div[data-role=tag]', this.$getTags()).forEach(($tag) => {
                        value.push($tag.getData('tag'));
                    });

                    return value.length > 0 ? value : null;
                }

                /**
                 * 필드값을 갱신한다.
                 */
                updateValue(): void {
                    super.setValue(this.getValue());
                }

                /**
                 * 필드를 랜더링한다.
                 */
                renderContent(): void {
                    const $tags = this.$getTags();
                    const $input = this.$getInput();
                    $tags.append($input);

                    this.$getContent().append($tags);
                }
            }

            export namespace Blocks {
                export interface Block {
                    /**
                     * @type {string} text - 블럭명칭
                     */
                    text: string;

                    /**
                     * @type {string} iconClass - 블럭 아이콘 스타일시트
                     */
                    iconClass?: string;

                    /**
                     * @type {Function} field - 블럭필드 생성자
                     */
                    field: () => Aui.Form.Field.Base | Aui.Form.Field.Container;
                }

                export interface Properties extends Aui.Form.Field.Base.Properties {
                    /**
                     * @type {string} buttonText - 블럭추가버튼 텍스트
                     */
                    buttonText?: string;

                    /**
                     * @type {Object} blocks - 블록목록
                     */
                    blocks?: { [type: string]: Aui.Form.Field.Blocks.Block };
                }
            }

            export class Blocks extends Aui.Form.Field.Base {
                field: string = 'blocks';
                button: Aui.Button;

                buttonText: string;
                blocks: { [type: string]: Aui.Form.Field.Blocks.Block };
                fieldContainer: Aui.Form.Field.Container;

                /**
                 * 블럭 클래스 생성한다.
                 *
                 * @param {Aui.Form.Field.Blocks.Properties} properties - 객체설정
                 */
                constructor(properties: Aui.Form.Field.Blocks.Properties = null) {
                    super(properties);

                    this.buttonText = this.properties.buttonText ?? Aui.printText('components.form.blocks.add');

                    this.blocks = this.properties.blocks ?? {
                        text: {
                            text: Aui.printText('components.form.blocks.text'),
                            iconClass: 'mi mi-type',
                            field: () => {
                                return new Aui.Form.Field.TextArea({
                                    name: 'text',
                                });
                            },
                        },
                    };
                }

                /**
                 * 블럭 추가 버튼을 가져온다.
                 *
                 * @return {Aui.Button} button
                 */
                getButton(): Aui.Button {
                    if (this.button === undefined) {
                        if (Object.keys(this.blocks).length > 1) {
                            this.button = new Aui.Button({
                                iconClass: 'mi mi-plus',
                                text: this.buttonText,
                                buttonClass: 'confirm',
                                parent: this,
                                menu: new Aui.Menu({
                                    items: ((blocks: { [type: string]: Aui.Form.Field.Blocks.Block }) => {
                                        const items = [];

                                        for (const type in blocks) {
                                            const block = blocks[type];
                                            items.push(
                                                new Aui.Menu.Item({
                                                    text: block.text,
                                                    iconClass: block.iconClass ?? null,
                                                    handler: async () => {
                                                        this.addBlock(type, block.field());
                                                        return true;
                                                    },
                                                })
                                            );
                                        }
                                        return items;
                                    })(this.blocks),
                                }),
                            });
                        } else {
                            this.button = new Aui.Button({
                                iconClass: 'mi mi-plus',
                                text: this.buttonText,
                                buttonClass: 'confirm',
                                parent: this,
                                handler: () => {
                                    const type = Object.keys(this.blocks).pop();
                                    const block = Object.values(this.blocks).pop();
                                    this.addBlock(type, block.field());
                                    return true;
                                },
                            });
                        }
                    }

                    return this.button;
                }

                /**
                 * 블럭에 추가된 필드를 구현할 컨테이너를 가져온다.
                 *
                 * @return {Aui.Button} button
                 */
                getFieldContainer(): Aui.Form.Field.Container {
                    if (this.fieldContainer === undefined) {
                        this.fieldContainer = new Aui.Form.Field.Container({
                            direction: 'column',
                            items: [],
                            hidden: true,
                            parent: this,
                        });
                    }

                    return this.fieldContainer;
                }

                /**
                 * 블럭 데이터를 지정한다.
                 *
                 * @param {Object[]} value - 값
                 * @param {boolean} is_origin - 원본값 변경여부
                 */
                setValue(value: any, is_origin: boolean = false): void {
                    if (Array.isArray(value) == true) {
                        this.getFieldContainer().empty();
                        for (const block of value as { type: string; value: any }[]) {
                            if (this.blocks[block.type] !== undefined) {
                                this.addBlock(block.type, this.blocks[block.type].field(), block.value);
                            }
                        }
                    } else {
                        value = null;
                    }

                    super.setValue(value, is_origin);
                }

                /**
                 * 필드값을 가져온다..
                 *
                 * @return {Object[]} value - 값
                 */
                getValue(): Object[] {
                    const blocks = [];
                    for (const block of this.getFieldContainer().getItems()) {
                        const field = block.getItemAt(0) as Aui.Form.Field.Base;
                        const value = field instanceof Aui.Form.Field.Container ? field.getValues() : field.getValue();
                        const data = {
                            type: block.properties.blockType,
                            value: value,
                        };
                        blocks.push(data);
                    }

                    if (blocks.length == 0) {
                        return null;
                    } else {
                        return blocks;
                    }
                }

                /**
                 * 블럭 콘텐츠 데이터를 업데이트한다.
                 */
                updateValue(): void {
                    const blocks = [];
                    for (const block of this.getFieldContainer().getItems()) {
                        const field = block.getItemAt(0) as Aui.Form.Field.Base;
                        const value = field instanceof Aui.Form.Field.Container ? field.getValues() : field.getValue();
                        const data = {
                            type: block.properties.blockType,
                            value: value,
                        };
                        blocks.push(data);
                    }

                    if (blocks.length == 0) {
                        super.setValue(null);
                    } else {
                        super.setValue(blocks);
                    }
                }

                /**
                 * 블럭을 추가한다.
                 *
                 * @param {string} type - 블럭타입
                 * @param {Aui.Form.Field.Base|Aui.Form.Field.Container} field - 추가할 필드
                 * @param {any} value - 필드값
                 * @param {number} index - 추가할 위치
                 */
                addBlock(
                    type: string,
                    field: Aui.Form.Field.Base | Aui.Form.Field.Container,
                    value: any = null,
                    index: number = null
                ): void {
                    field.addEvent('change', () => {
                        this.updateValue();
                    });

                    field.$getComponent().setStyle('flex-grow', 1);

                    const block = new Aui.Form.Field.Container({
                        blockType: type,
                        label:
                            '<i class="' + this.blocks[type].iconClass + '"><b>' + this.blocks[type].text + '</b></i>',
                        labelSeparator: '',
                        class: 'block',
                        items: [],
                        parent: this,
                        listeners: {
                            render: (field) => {
                                field.$getTop().setStyle('width', null);
                                field.$getContent().setStyle('width', null);
                            },
                        },
                    });
                    block.append(field);
                    field.setParent(block);
                    block.append(
                        new Aui.Form.Field.Container({
                            direction: 'column',
                            class: 'buttons',
                            items: [
                                new Aui.Button({
                                    iconClass: 'mi mi-caret-up',
                                    handler: (button) => {
                                        const item = button.getParent().getParent();
                                        const container = item.getParent() as Aui.Form.Field.Container;
                                        const index = container.getItemIndex(item);

                                        let scrollarea: Aui.Component = null;
                                        let parent = container.getForm() as Aui.Component;
                                        while (parent !== null) {
                                            if (parent.getScroll().isScrollable('y') == true) {
                                                scrollarea = parent;
                                                break;
                                            }

                                            parent = parent.getParent();
                                        }

                                        if (index > 0) {
                                            const swap = container.getItemAt(index - 1);
                                            container.items[index - 1] = item;
                                            container.items[index] = swap;

                                            const offset = item.$getComponent().getOffset().top;

                                            item.$getComponent().addClass('moved');

                                            const $parent = item.$getComponent().getParent();
                                            $parent.append(item.$getComponent(), index - 1);

                                            scrollarea
                                                ?.getScroll()
                                                .movePosition(0, item.$getComponent().getOffset().top - offset);

                                            item.$getComponent().removeClass('moved');
                                        }
                                    },
                                }),
                                new Aui.Button({
                                    iconClass: 'mi mi-caret-down',
                                    handler: (button) => {
                                        const item = button.getParent().getParent();
                                        const container = item.getParent() as Aui.Form.Field.Container;
                                        const index = container.getItemIndex(item);

                                        let scrollarea: Aui.Component = null;
                                        let parent = container.getForm() as Aui.Component;
                                        while (parent !== null) {
                                            if (parent.getScroll().isScrollable('y') == true) {
                                                scrollarea = parent;
                                                break;
                                            }

                                            parent = parent.getParent();
                                        }

                                        if (index < container.getItems().length - 1) {
                                            const swap = container.getItemAt(index + 1);
                                            container.items[index + 1] = item;
                                            container.items[index] = swap;

                                            const offset = item.$getComponent().getOffset().top;

                                            item.$getComponent().addClass('moved');

                                            const $parent = item.$getComponent().getParent();
                                            $parent.append(swap.$getComponent(), index);

                                            scrollarea
                                                ?.getScroll()
                                                .movePosition(0, item.$getComponent().getOffset().top - offset);

                                            item.$getComponent().removeClass('moved');
                                        }
                                    },
                                }),
                            ],
                        })
                    );
                    block.append(
                        new Aui.Form.Field.Container({
                            direction: 'column',
                            class: 'buttons',
                            items: [
                                new Aui.Button({
                                    iconClass: 'mi mi-trash',
                                    buttonClass: 'danger',
                                    handler: (button) => {
                                        const item = button.getParent().getParent();
                                        item.remove();
                                    },
                                }),
                                Object.keys(this.blocks).length > 1
                                    ? new Aui.Button({
                                          iconClass: 'mi mi-plus',
                                          buttonClass: 'confirm',
                                          hideArrow: true,
                                          menu: new Aui.Menu({
                                              items: ((blocks: { [type: string]: Aui.Form.Field.Blocks.Block }) => {
                                                  const items = [];

                                                  for (const type in blocks) {
                                                      const block = blocks[type];
                                                      items.push(
                                                          new Aui.Menu.Item({
                                                              text: block.text,
                                                              iconClass: block.iconClass ?? null,
                                                              handler: async (menu) => {
                                                                  const button = menu
                                                                      .getParent()
                                                                      .getParent() as Aui.Button;
                                                                  const item = button.getParent().getParent();
                                                                  const container =
                                                                      item.getParent() as Aui.Form.Field.Container;
                                                                  const index = container.getItemIndex(item);
                                                                  this.addBlock(type, block.field(), null, index + 1);
                                                                  return true;
                                                              },
                                                          })
                                                      );
                                                  }
                                                  return items;
                                              })(this.blocks),
                                          }),
                                      })
                                    : new Aui.Button({
                                          iconClass: 'mi mi-plus',
                                          buttonClass: 'confirm',
                                          handler: () => {
                                              const type = Object.keys(this.blocks).pop();
                                              const block = Object.values(this.blocks).pop();
                                              this.addBlock(type, block.field());
                                              return true;
                                          },
                                      }),
                            ],
                        })
                    );

                    this.getFieldContainer().append(block, index);
                    if (this.getFieldContainer().getItems().length > 0) {
                        this.getFieldContainer().show();
                    }

                    if (value !== null) {
                        if (field instanceof Aui.Form.Field.Base) {
                            field.setValue(value);
                        } else {
                            field.setValues(value);
                        }
                    }

                    if (index !== null) {
                        block.$getComponent().addClass('moved');

                        let scrollarea: Aui.Component = null;
                        let parent = this.getForm() as Aui.Component;
                        while (parent !== null) {
                            if (parent.getScroll().isScrollable('y') == true) {
                                scrollarea = parent;
                                break;
                            }

                            parent = parent.getParent();
                        }

                        if (scrollarea !== null) {
                            const contentHeight = scrollarea.$getContent().getOuterHeight();
                            const position =
                                block.$getComponent().getOffset().top - scrollarea.$getContent().getOffset().top;
                            if (position <= 0) {
                                scrollarea.getScroll()?.movePosition(0, position - 10, true, true);
                            } else if (position >= contentHeight) {
                                const scroll = position - contentHeight + field.$getComponent().getOuterHeight() + 10;
                                scrollarea.getScroll()?.movePosition(0, scroll, true, true);
                            }
                        }

                        block.$getComponent().removeClass('moved');
                    }
                }

                /**
                 * 필드를 랜더링한다.
                 */
                renderContent(): void {
                    const $blocks = Html.create('div', { 'data-role': 'blocks' });
                    $blocks.append(this.getFieldContainer().$getComponent());
                    this.getFieldContainer().render();

                    $blocks.append(this.getButton().$getComponent());
                    this.getButton().render();

                    this.$getContent().append($blocks);
                }
            }

            export namespace File {
                export interface Properties extends Aui.Form.Field.Base.Properties {
                    /**
                     * @type {string} accept - 업로드 허용파일
                     */
                    accept?: string;

                    /**
                     * @type {boolean} multiple - 다중파일 선택여부
                     */
                    multiple?: boolean;

                    /**
                     * @type {string} buttonText - 파일선택 버튼 아이콘 클래스
                     */
                    buttonIconClass?: string;

                    /**
                     * @type {string} buttonText - 파일선택 버튼 텍스트
                     */
                    buttonText?: string;
                }
            }

            export class File extends Aui.Form.Field.Base {
                type: string = 'form';
                role: string = 'field';
                field: string = 'file';

                accept: string;
                multiple: boolean;
                uploader: modules.attachment.Uploader;
                $files: Dom;

                button: Aui.Button;

                /**
                 * 템플릿필드 클래스 생성한다.
                 *
                 * @param {Aui.Form.Field.Theme.Properties} properties - 객체설정
                 */
                constructor(properties: Aui.Form.Field.File.Properties = null) {
                    super(properties);

                    this.accept = this.properties.accept ?? '*';
                    this.multiple = this.properties.multiple !== false;
                }

                /**
                 * 파일선택 버튼을 가져온다.
                 *
                 * @return {Aui.Button} button
                 */
                getButton(): Aui.Button {
                    if (this.button === undefined) {
                        this.button = new Aui.Button({
                            iconClass: this.properties.buttonIconClass ?? 'mi mi-upload',
                            text: this.properties.buttonText ?? Aui.printText('buttons.file_select'),
                            parent: this,
                            handler: () => {
                                this.select();
                            },
                        });
                    }
                    return this.button;
                }

                /**
                 * 업로더를 가져온다.
                 *
                 * @return {modules.attachment.Uploader} uploader
                 */
                getUploader(): modules.attachment.Uploader {
                    if (this.uploader === undefined) {
                        this.uploader = new modules.attachment.Uploader(this.$getContent(), {
                            accept: this.accept,
                            multiple: this.multiple,
                            listeners: {
                                start: () => {
                                    this.onUploadstart();
                                },
                                complete: (uploader: modules.attachment.Uploader) => {
                                    this.onUploadComplete(uploader);
                                },
                            },
                        });
                    }

                    return this.uploader;
                }

                /**
                 * 파일목록 DOM 을 가져온다.
                 *
                 * @return {Dom} $files
                 */
                $getFiles(): Dom {
                    if (this.$files === undefined) {
                        this.$files = Html.create('ul', { 'data-role': 'files' });
                    }

                    return this.$files;
                }

                /**
                 * 파일을 선택한다.
                 */
                select(): void {
                    this.getUploader().select();
                }

                /**
                 * 필드값을 지정한다.
                 *
                 * @param {any} value - 값
                 * @param {boolean} is_origin - 원본값 변경여부
                 */
                setValue(value: any, is_origin: boolean = false): void {
                    if (value !== null && Array.isArray(value) == true) {
                        this.getUploader().setValue(value);
                    } else {
                        this.getUploader().setValue([]);
                    }

                    super.setValue(this.getUploader().getValue(), is_origin);
                }

                /**
                 * 파일 필드를 랜더링한다.
                 */
                renderContent(): void {
                    this.$getContent().append(this.getButton().$getComponent());
                    this.getButton().render();

                    this.$getContent().append(this.$getFiles());
                }

                /**
                 * 업로드 시작이벤트를 처리한다.
                 */
                onUploadstart(): void {
                    this.getForm().setLoading(this, true);
                }

                /**
                 * 업로드 종료이벤트를 처리한다.
                 */
                onUploadComplete(uploader: modules.attachment.Uploader): void {
                    this.getForm().setLoading(this, false);
                    this.setValue(uploader.getValue());
                }
            }

            export namespace Image {
                export interface Properties extends Aui.Form.Field.Base.Properties {
                    /**
                     * @type {number} imageWidth - 이미지 미리보기 너비
                     */
                    imageWidth?: number;

                    /**
                     * @type {number} imageHeight - 이미지 미리보기 높이
                     */
                    imageHeight?: number;

                    /**
                     * @type {string} showSize - 이미지 크기를 보여줄지 여부
                     */
                    showSize?: boolean;

                    /**
                     * @type {string} emptyText - 필드값이 없을 경우 보일 placeHolder
                     */
                    emptyText?: string;
                }
            }

            export class Image extends Aui.Form.Field.File {
                type: string = 'form';
                role: string = 'field';
                field: string = 'image';

                reset: Aui.Button;

                $preview: Dom;

                imageWidth: number;
                imageHeight: number;
                showSize: boolean;

                emptyText: string;
                $emptyText: Dom;

                $display: Dom;

                /**
                 * 템플릿필드 클래스 생성한다.
                 *
                 * @param {Aui.Form.Field.Image.Properties} properties - 객체설정
                 */
                constructor(properties: Aui.Form.Field.Image.Properties = null) {
                    super(properties);

                    this.accept = this.properties.accept ?? 'image/*';
                    this.multiple = false;

                    this.properties.buttonText = this.properties.buttonText ?? Aui.printText('buttons.image_select');
                    this.properties.buttonIconClass = this.properties.buttonIconClass ?? 'mi mi-image';

                    this.showSize = this.properties.showSize === true;
                    this.setImageSize(this.properties.imageWidth ?? 54, this.properties.imageHeight ?? 54);

                    this.emptyText = this.properties.emptyText ?? '';
                    this.emptyText = this.emptyText.length == 0 ? null : this.emptyText;
                }

                /**
                 * 초기화 버튼을 가져온다.
                 *
                 * @return {Aui.Button} button
                 */
                getReset(): Aui.Button {
                    if (this.reset === undefined) {
                        this.reset = new Aui.Button({
                            iconClass: 'mi mi-trash',
                            buttonClass: 'danger',
                            parent: this,
                            text: Aui.printText('buttons.delete'),
                            handler: () => {
                                this.uploader.setValue([]);
                            },
                        });
                    }
                    return this.reset;
                }

                /**
                 * 이미지 미리보기 DOM 을 가져온다.
                 *
                 * @return {Dom} $files
                 */
                $getPreview(): Dom {
                    if (this.$preview === undefined) {
                        this.$preview = Html.create('div', { 'data-role': 'image' });
                        const $size = Html.create('label', { 'data-role': 'size' });
                        this.$preview.append($size);
                        const $files = Html.create('ul', { 'data-role': 'files' });
                        this.$preview.append($files);
                    }

                    return this.$preview;
                }

                /**
                 * 파일정보 DOM 객체를 가져온다.
                 *
                 * @return {Dom} $display
                 */
                $getDisplay(): Dom {
                    if (this.$display === undefined) {
                        this.$display = Html.create('div', { 'data-role': 'display' });
                        this.$display.hide();
                    }

                    return this.$display;
                }

                /**
                 * placeHolder DOM 객체를 가져온다.
                 *
                 * @return {Dom} $emptyText
                 */
                $getEmptyText(): Dom {
                    if (this.$emptyText === undefined) {
                        this.$emptyText = Html.create('div', { 'data-role': 'empty' });
                    }

                    return this.$emptyText;
                }

                /**
                 * 이미지 미리보기 크기를 조절한다.
                 *
                 * @param {number} imageWidth - 가로크기
                 * @param {number} imageHeight - 세로크기
                 */
                setImageSize(imageWidth: number, imageHeight: number): void {
                    this.imageWidth = imageWidth ?? null;
                    this.imageHeight = imageHeight ?? null;

                    imageWidth ??= 54;
                    imageHeight ??= 54;

                    const maxWidth = 200;
                    const maxHeight = 54;

                    imageWidth = Math.round((imageWidth * maxHeight) / imageHeight);
                    imageHeight = maxHeight;

                    if (imageWidth > maxWidth) {
                        imageHeight = Math.round((imageHeight * maxWidth) / imageWidth);
                        imageWidth = maxWidth;
                    }

                    this.$getPreview().setStyle('width', imageWidth + 'px');
                    this.$getPreview().setStyle('height', Math.max(maxHeight, imageHeight) + 'px');

                    const $size = Html.get('label[data-role=size]', this.$getPreview());
                    if (this.showSize == true && this.imageWidth !== null && this.imageHeight !== null) {
                        $size.html(this.imageWidth + '&times;' + this.imageHeight);
                    } else {
                        $size.empty();
                    }

                    const $files = Html.get('ul[data-role=files]', this.$getPreview());
                    $files.setStyle('width', imageWidth + 'px');
                    $files.setStyle('height', imageHeight + 'px');
                }

                /**
                 * placeHolder 문자열을 설정한다.
                 *
                 * @param {string} emptyText - placeHolder (NULL 인 경우 표시하지 않음)
                 */
                setEmptyText(emptyText: string = null): void {
                    this.emptyText = emptyText === null || emptyText.length == 0 ? null : emptyText;

                    if (this.isRendered() == true) {
                        this.updateLayout();
                    }
                }

                /**
                 * 필드값을 가져온다.
                 *
                 * @return {any} value - 값
                 */
                getValue(): any {
                    if (this.value === null || this.value?.length !== 1) {
                        return null;
                    }

                    return this.value[0];
                }

                /**
                 * 필드값을 지정한다.
                 *
                 * @param {any} value - 값
                 * @param {boolean} is_origin - 원본값 변경여부
                 */
                setValue(value: any, is_origin: boolean = false): void {
                    if (Array.isArray(value) === true) {
                        if (value.length !== 1) {
                            value = null;
                        }
                    } else if (typeof value == 'string') {
                        value = [value];
                    } else {
                        value = null;
                    }

                    super.setValue(value, is_origin);

                    if (value == null) {
                        this.$getEmptyText().show();
                        this.$getDisplay().hide();
                    } else {
                        this.$getEmptyText().hide();
                        this.$getDisplay().show();
                    }
                }

                /**
                 * 파일정보를 출력한다.
                 *
                 * @param {modules.attachment.Uploader.File} file - 파일객체
                 */
                setDisplay(file: modules.attachment.Uploader.File): void {
                    const $file = Html.create('span');
                    const $size = Html.create('small', null, '(' + Format.size(file.attachment.size) + ')');
                    $file.append($size);
                    const $download = Html.create(
                        'a',
                        { href: file.attachment.download, download: file.attachment.name },
                        file.attachment.name
                    );
                    $file.append($download);

                    this.$getDisplay().empty();
                    this.$getDisplay().append($file);
                }

                /**
                 * 파일 필드를 랜더링한다.
                 */
                renderContent(): void {
                    this.$getContent().append(this.$getPreview());

                    const $components = Html.create('div', { 'data-role': 'components' });
                    this.$getContent().append($components);

                    const $buttons = Html.create('div', { 'data-role': 'buttons' });
                    $buttons.append(this.getButton().$getComponent());
                    this.getButton().render();
                    $buttons.append(this.getReset().$getComponent());
                    this.getReset().render();
                    $components.append($buttons);

                    $components.append(this.$getEmptyText());
                    $components.append(this.$getDisplay());
                }

                /**
                 * 필드 레이아웃을 업데이트한다.
                 */
                updateLayout(): void {
                    super.updateLayout();

                    const $emptyText = this.$getEmptyText();
                    $emptyText.html(this.emptyText);
                }

                /**
                 * 업로드 종료이벤트를 처리한다.
                 */
                onUploadComplete(uploader: modules.attachment.Uploader): void {
                    const file = uploader.getFileById(uploader.getValue()[0]);

                    if (file === null) {
                        this.$getDisplay().hide();
                        this.$getEmptyText().show();
                    } else {
                        this.setDisplay(file);
                    }

                    super.onUploadComplete(uploader);
                }
            }

            export namespace Select {
                export interface Listeners extends Aui.Form.Field.Base.Listeners {
                    /**
                     * @type {Function} expand - 선택항목이 열렸을 때
                     */
                    expand?: (field: Aui.Form.Field.Select) => void;

                    /**
                     * @type {Function} collapse - 선택항목이 숨겨졌을 때
                     */
                    collapse?: (field: Aui.Form.Field.Select) => void;

                    /**
                     * @type {Function} render - 필드가 랜더링 되었을 때
                     */
                    render?: (field: Aui.Form.Field.Select) => void;
                }

                export interface Properties extends Aui.Form.Field.Base.Properties {
                    /**
                     * @type {Aui.Store|Aui.TreeStore} store - 목록 store
                     */
                    store: Aui.Store | Aui.TreeStore;

                    /**
                     * @type {boolean} multiple - 다중선택여부
                     */
                    multiple?: boolean;

                    /**
                     * @type {boolean} search - 목록 검색여부
                     */
                    search?: boolean;

                    /**
                     * @type {Objext} searchField - 검색할 필드명
                     */
                    searchField?: string;

                    /**
                     * @type {Objext} searchOperator - 검색방법
                     */
                    searchOperator?: string;

                    /**
                     * @type {boolean} liveSearch - 검색어 입력도중 검색을 수행할지 여부
                     */
                    liveSearch?: boolean;

                    /**
                     * @type {boolean} remoteSearch - 외부에서 검색을 수행할지 여부
                     */
                    remoteSearch?: boolean;

                    /**
                     * @type {string} emptyText - 필드값이 없을 경우 보일 placeHolder
                     */
                    emptyText?: string;

                    /**
                     * @type {string} displayField - 선택된 값을 표시할 store 의 field 명
                     */
                    displayField?: string;

                    /**
                     * @type {string} valueField - 폼 전송시 전송될 값을 지정할 store 의 field 명
                     */
                    valueField?: string;

                    /**
                     * @type {string} listField - 목록 항목에 표시할 store 의 field 명
                     */
                    listField?: string;

                    /**
                     * @type {Function} renderer - 선택된 항목을 보일 때 사용할 렌더링 함수
                     */
                    renderer?: (
                        display: string | string[],
                        record: Aui.Data.Record | Aui.Data.Record[],
                        $display: Dom,
                        field: Aui.Form.Field.Select
                    ) => string;

                    /**
                     * @type {Function} renderer - 목록 항목을 보일 때 사용할 렌더링 함수
                     */
                    listRenderer?: (display: string, record: Aui.Data.Record, $dom: Dom) => string;

                    /**
                     * @type {Object} grouper - 그룹설정
                     */
                    listGrouper?: {
                        dataIndex: string;
                        sorters: { [field: string]: 'ASC' | 'DESC' | string[] };
                        renderer?: (
                            value: string,
                            dataIndex: string,
                            record: Aui.Data.Record,
                            grid: Aui.Grid.Panel
                        ) => string;
                    };

                    /**
                     * @type {number} listWidth - 목록너비 (NULL 인 경우 필드너비)
                     */
                    listWidth?: number;

                    /**
                     * @type {string} listClass - 목록 스타일 클래스명
                     */
                    listClass?: string;

                    /**
                     * @type {boolean} expandOnFocus - 포커스 지정시 자동으로 확장할지 여부
                     */
                    expandOnFocus?: boolean;

                    /**
                     * @type {boolean} expandOnFocus - 엔터키로 확장할지 여부
                     */
                    expandOnEnter?: boolean;

                    /**
                     * @type {string} loadingType - 로딩메시지 타입
                     */
                    loadingType?: Aui.Loading.Type;

                    /**
                     * @type {string} loadingText - 로딩메시지
                     */
                    loadingText?: string;

                    /**
                     * @type {Aui.Form.Field.Select.Listeners} listeners - 이벤트리스너
                     */
                    listeners?: Aui.Form.Field.Select.Listeners;
                }
            }

            export class Select extends Aui.Form.Field.Base {
                field: string = 'select';

                search: boolean;
                searchField: string;
                searchOperator: string;
                searching: boolean = false;
                liveSearch: boolean;
                remoteSearch: boolean;
                multiple: boolean;
                emptyText: string;

                displayField: string;
                valueField: string;
                listField: string;

                rawValue: any;
                storeParams: { [key: string]: any } = null;

                renderer: (
                    display: string | string[],
                    record: Aui.Data.Record | Aui.Data.Record[],
                    $display: Dom,
                    field: Aui.Form.Field.Select
                ) => string;

                listRenderer: (display: string, record: Aui.Data.Record, $dom: Dom) => string;
                listGrouper: {
                    dataIndex: string;
                    sorters: { [field: string]: 'ASC' | 'DESC' | string[] };
                    renderer?: (
                        value: string,
                        dataIndex: string,
                        record: Aui.Data.Record,
                        grid: Aui.Grid.Panel
                    ) => string;
                };
                listWidth: number;

                $button: Dom;
                $display: Dom;
                $emptyText: Dom;
                $search: Dom;

                absolute: Aui.Absolute;
                list: Aui.Grid.Panel | Aui.Tree.Panel;

                expandOnFocus: boolean;
                expandOnEnter: boolean;

                loading: Aui.Loading;

                /**
                 * 선택항목필드 클래스 생성한다.
                 *
                 * @param {Aui.Form.Field.Select.Properties} properties - 객체설정
                 */
                constructor(properties: Aui.Form.Field.Select.Properties = null) {
                    super(properties);

                    this.search = this.properties.search === true;
                    this.liveSearch = this.properties.liveSearch === true;
                    this.remoteSearch = this.properties.remoteSearch === true;
                    this.multiple = this.properties.multiple === true;
                    this.emptyText = this.properties.emptyText ?? '';
                    this.emptyText = this.emptyText.length == 0 ? null : this.emptyText;

                    this.displayField = this.properties.displayField ?? 'display';
                    this.valueField = this.properties.valueField ?? 'value';
                    this.listField = this.properties.listField ?? this.displayField;
                    this.listRenderer = this.properties.listRenderer ?? null;
                    this.listGrouper = this.properties.listGrouper ?? null;
                    this.listWidth = this.properties.listWidth ?? null;

                    this.searchField = this.properties.searchField ?? this.displayField;
                    this.searchOperator = this.properties.searchOperator ?? 'likecode';

                    this.expandOnFocus = this.properties.expandOnFocus === true;
                    this.expandOnEnter = this.properties.expandOnEnter !== false;

                    this.renderer =
                        this.properties.renderer ??
                        ((display): string => {
                            if (Array.isArray(display) == true) {
                                if (display.length > 1) {
                                    return Aui.printText('components.form.select.values', {
                                        display: display[0],
                                        count: (display.length - 1).toString(),
                                    });
                                } else {
                                    return display[0];
                                }
                            } else if (typeof display == 'string' && display.length > 0) {
                                return display;
                            }

                            return '';
                        });

                    this.loading = new Aui.Loading(this, {
                        type: this.properties.loadingType ?? 'column',
                        direction: 'row',
                        message: this.properties.loadingText ?? null,
                        modal: false,
                    });
                }

                /**
                 * 절대위치 목록 컴포넌트를 가져온다.
                 *
                 * @return {Aui.Absolute} absolute
                 */
                getAbsolute(): Aui.Absolute {
                    if (this.absolute === undefined) {
                        this.absolute = new Aui.Absolute({
                            $target: this.$getContent(),
                            items: [this.getList()],
                            direction: 'y',
                            hideOnClick: true,
                            parent: this,
                            width: this.listWidth,
                            listeners: {
                                render: () => {
                                    this.getAbsolute()
                                        .$getContainer()
                                        .setStyle('border-color', 'var(--aui-color-accent-500)');
                                },
                                show: () => {
                                    this.getList().setMaxWidth(null);
                                    this.getList().setMaxHeight(null);
                                    this.getAbsolute().updatePosition();
                                    this.getList().setMaxWidth(this.getAbsolute().getPosition().maxWidth - 2);
                                    this.getList().setMaxHeight(this.getAbsolute().getPosition().maxHeight - 2);
                                    this.$getContent().addClass('expand');
                                },
                                hide: () => {
                                    this.$getContent().removeClass('expand');
                                    this.match('');
                                    this.fireEvent('collapse', [this]);
                                },
                            },
                        });
                    }

                    return this.absolute;
                }

                /**
                 * 목록 컴포넌트를 가져온다.
                 *
                 * @return {Aui.Grid.Panel|Aui.Tree.Panel} list
                 */
                getList(): Aui.Grid.Panel | Aui.Tree.Panel {
                    if (this.list === undefined) {
                        const properties = {
                            store: this.properties.store,
                            parent: this,
                            selection: {
                                selectable: true,
                                type: this.multiple ? 'check' : 'row',
                                multiple: this.multiple,
                                deselectable: this.multiple,
                                keepable: true,
                            },
                            grouper: this.listGrouper,
                            columnHeaders: false,
                            rowLines: false,
                            border: false,
                            topbar:
                                this.multiple == true
                                    ? [
                                          '->',
                                          new Aui.Button({
                                              text: Aui.printText('buttons.select_complete'),
                                              buttonClass: 'confirm',
                                              handler: () => {
                                                  this.getList().onSelectionComplete();
                                              },
                                          }),
                                      ]
                                    : null,
                            columns: [
                                {
                                    text: 'display',
                                    dataIndex: this.listField,
                                    flex: 1,
                                    renderer: (value: any, record: Aui.Data.Record, $dom: Dom) => {
                                        if (this.listRenderer !== null) {
                                            return this.listRenderer(value, record, $dom);
                                        } else {
                                            return value;
                                        }
                                    },
                                },
                            ],
                            listeners: {
                                beforeLoad: () => {
                                    this.onBeforeLoad();
                                    this.getList().setHeight(80);
                                },
                                load: () => {
                                    this.onLoad();
                                },
                                update: () => {
                                    if (this.getList().getStore().isLoaded() == true) {
                                        this.getAbsolute().setVisibility(this.getList().getStore().getCount() == 0);
                                    }
                                    this.getList().setMaxWidth(null);
                                    this.getList().setMaxHeight(null);
                                    this.getAbsolute().updatePosition();
                                    this.getList().setHeight(null);
                                    this.getList().setMaxWidth(this.getAbsolute().getPosition().maxWidth - 2);
                                    this.getList().setMaxHeight(this.getAbsolute().getPosition().maxHeight - 2);
                                    this.onUpdate();
                                },
                                selectionChange: async (selections: Aui.Data.Record[], panel: Aui.Panel) => {
                                    if (this.multiple == true) {
                                        let text = Aui.printText('buttons.select_complete');
                                        if (selections.length > 0) {
                                            text += '(' + selections.length + ')';
                                        }
                                        const button = panel.getToolbar('top').getItemAt(1) as Aui.Button;
                                        button.setText(text);
                                    }
                                },
                                selectionComplete: async (selections: Aui.Data.Record[]) => {
                                    if (selections.length == 0) {
                                        await this.setValue(null);
                                    } else if (this.multiple == false && selections.length == 1) {
                                        await this.setValue(selections[0].get(this.valueField));
                                    } else {
                                        const values = [];
                                        for (const selection of selections) {
                                            values.push(selection.get(this.valueField));
                                        }
                                        await this.setValue(values);
                                    }

                                    this.collapse();
                                    this.$getButton().focus();
                                },
                            },
                        };

                        if (this.properties.store instanceof Aui.Store) {
                            this.list = new Aui.Grid.Panel(properties as Aui.Grid.Panel.Properties);
                        } else {
                            this.list = new Aui.Tree.Panel(properties as Aui.Tree.Panel.Properties);
                        }
                    }

                    return this.list;
                }

                /**
                 * 데이터스토어를 가져온다.
                 *
                 * @return {Aui.Store | Aui.TreeStore} store
                 */
                getStore(): Aui.Store | Aui.TreeStore {
                    return this.getList().getStore();
                }

                /**
                 * 선택항목 버튼 DOM 객체를 가져온다.
                 *
                 * @return {Dom} $button
                 */
                $getButton(): Dom {
                    if (this.$button === undefined) {
                        this.$button = Html.create('button', { type: 'button' });
                        if (this.search == true) {
                            this.$button.setAttr('tabindex', '-1');
                        } else {
                            this.$button.setAttr('tabindex', '0');
                        }
                        this.$button.on('pointerdown', (e: PointerEvent) => {
                            const $button = Html.el(e.currentTarget);
                            if (this.isExpand() == true) {
                                this.collapse();
                            } else {
                                this.expand();
                            }

                            e.preventDefault();
                            e.stopImmediatePropagation();
                            $button.getEl().focus();
                        });
                        this.$button.on('click', (e: MouseEvent) => {
                            e.preventDefault();
                            e.stopImmediatePropagation();
                        });
                        this.$button.on('focus', () => {
                            this.onFocus();
                        });
                        this.$button.on('blur', () => {
                            this.collapse();
                            this.onBlur();
                        });
                        this.setKeyboardEvent(this.$button);

                        const $display = this.$getDisplay();
                        this.$button.append($display);
                    }
                    return this.$button;
                }

                /**
                 * placeHolder DOM 객체를 가져온다.
                 *
                 * @return {Dom} $emptyText
                 */
                $getEmptyText(): Dom {
                    if (this.$emptyText === undefined) {
                        this.$emptyText = Html.create('div', { 'data-role': 'empty' });
                    }

                    return this.$emptyText;
                }

                /**
                 * 디스플레이 DOM 객체를 가져온다.
                 *
                 * @return {Dom} $display
                 */
                $getDisplay(): Dom {
                    if (this.$display === undefined) {
                        this.$display = Html.create('div', { 'data-role': 'display' });
                    }

                    return this.$display;
                }

                /**
                 * 검색폼 DOM 객체를 가져온다.
                 *
                 * @return {Dom} $button
                 */
                $getSearch(): Dom {
                    if (this.$search === undefined) {
                        this.$search = Html.create('input', {
                            'type': 'search',
                            'tabindex': '0',
                        });
                        this.$search.on('input', () => {
                            this.searching = true;
                            if (this.$search.getData('timeout') !== null) {
                                clearTimeout(this.$search.getData('timeout'));
                                this.$search.setData('timeout', null);
                            }
                            this.expand();
                            this.match(this.$search.getValue());
                            this.searchingMode();
                        });
                        this.$search.on('focus', () => {
                            this.searching = true;
                            this.expand();
                            this.match(this.$search.getValue());
                            this.searchingMode();
                        });
                        this.$search.on('pointerdown', (e: PointerEvent) => {
                            this.searching = true;
                            this.expand();
                            e.stopImmediatePropagation();
                        });
                        this.$search.on('blur', () => {
                            this.searching = false;
                            this.$search.setValue('');
                            this.searchingMode();
                        });
                        this.setKeyboardEvent(this.$search);
                    }
                    return this.$search;
                }

                /**
                 * placeHolder 문자열을 설정한다.
                 *
                 * @param {string} emptyText - placeHolder (NULL 인 경우 표시하지 않음)
                 */
                setEmptyText(emptyText: string = null): void {
                    this.emptyText = emptyText === null || emptyText.length == 0 ? null : emptyText;

                    if (this.isRendered() == true) {
                        this.$getEmptyText().html(this.emptyText ?? '');
                    }
                }

                /**
                 * 필드값으로 데이터스토어의 레코드를 가져온다.
                 *
                 * @param {any} value - 필드값
                 * @return {Promise<Aui.Data.Record>} record
                 */
                async getValueToRecord(value: any): Promise<Aui.Data.Record> {
                    const target = {};
                    target[this.valueField] = value;
                    if (this.getStore().isLoaded() == false) {
                        await this.getStore().load();
                        return this.getValueToRecord(value);
                    }

                    const record = this.getStore().find(target);

                    if (record !== null) {
                        return record;
                    } else {
                        const store = this.getStore();
                        if (store instanceof Aui.TreeStore) {
                            const parents = await store.getParents(target);
                            if (parents !== null) {
                                return this.getValueToRecord(value);
                            }
                        }
                    }

                    return null;
                }

                /**
                 * 필드값으로 데이터스토어의 레코드를 가져온다.
                 *
                 * @param {any} value - 필드값
                 * @return {Promise<Aui.Data.Record>} record
                 */
                async getValueToIndex(value: any): Promise<number | number[]> {
                    const target = {};
                    target[this.valueField] = value;

                    if (this.getStore().isLoaded() == false) {
                        await this.getStore().load();
                        return this.getValueToIndex(value);
                    }

                    const index = this.getStore().findIndex(target);

                    if (index !== null) {
                        return index;
                    } else {
                        const store = this.getStore();
                        if (store instanceof Aui.TreeStore) {
                            const parents = await store.getParents(target);
                            if (parents !== null) {
                                return this.getValueToIndex(value);
                            }
                        }
                    }

                    return null;
                }

                /**
                 * 필드값을 지정한다.
                 *
                 * @param {any} value - 값
                 * @param {boolean} is_origin - 원본값 변경여부
                 */
                async setValue(value: any, is_origin: boolean = false): Promise<void> {
                    if (this.isRendered() === false) {
                        this.oValue = value;
                        this.value = undefined;
                        return;
                    }

                    if (this.matchingValue !== null) {
                        await this.matchingValue;
                    }
                    this.matchingValue = this.matchValue(value, is_origin);
                    await this.matchingValue;
                }

                /**
                 * 필드값을 검색하여 찾는다.
                 *
                 * @param {any} value - 값
                 * @param {boolean} is_origin - 원본값 변경여부
                 */
                matchingValue: Promise<void> = null;
                async matchValue(value: any, is_origin: boolean = false): Promise<void> {
                    value ??= null;
                    this.rawValue = value;

                    if (value === null) {
                        this.$getEmptyText().show();
                        this.$getDisplay().html(this.renderer('', null, this.$getDisplay(), this));
                        super.setValue(value, is_origin);
                        this.rawValue = null;
                    } else {
                        if (this.multiple == true) {
                            if (Array.isArray(value) == false) {
                                value = [value];
                            }
                        } else {
                            if (Array.isArray(value) == true) {
                                value = value.pop();
                            }
                        }

                        if (Array.isArray(value) == true) {
                            const results = [];
                            for (const v of value) {
                                results.push(await this.getValueToRecord(v));
                            }

                            const displays = [];
                            const values = [];
                            const records = [];

                            for (const record of results) {
                                if (record !== null) {
                                    displays.push(record.get(this.displayField));
                                    values.push(record.get(this.valueField));
                                    records.push(record);
                                }
                            }

                            if (values.length == 0) {
                                value = null;
                                this.$getDisplay().hide();
                                this.$getEmptyText().show();
                            } else {
                                value = values;
                                this.$getEmptyText().hide();
                                this.$getDisplay().html(this.renderer(displays, records, this.$getDisplay(), this));
                                this.$getDisplay().show();
                            }

                            super.setValue(value, is_origin);
                            if (Format.isEqual(value, this.rawValue) == true) {
                                this.rawValue = null;
                            }
                            this.searchingMode();
                        } else {
                            const record = await this.getValueToRecord(value);
                            if (record == null) {
                                value = null;
                                this.$getDisplay().hide();
                                this.$getEmptyText().show();
                            } else {
                                value = record.get(this.valueField);
                                this.$getEmptyText().hide();
                                this.$getDisplay().html(
                                    this.renderer(
                                        record?.get(this.displayField) ?? '',
                                        record,
                                        this.$getDisplay(),
                                        this
                                    )
                                );
                                this.$getDisplay().show();
                            }

                            super.setValue(value, is_origin);
                            if (Format.isEqual(value, this.rawValue) == true) {
                                this.rawValue = null;
                            }
                            this.searchingMode();
                        }
                    }
                }

                /**
                 * 항목 인덱스로 항목을 선택한다.
                 *
                 * @param {(number|number[])} index - 항목인덱스
                 */
                select(index: number | number[]): void {
                    const list = this.getList();
                    if (list instanceof Aui.Grid.Panel) {
                        list.selectRow(index as number, this.multiple);
                    } else {
                        list.selectRow(index as number[], this.multiple);
                    }
                }

                /**
                 * 필드의 DOM 객체의 일부 키보드 이벤트를 목록 컴포넌트로 전달한다.
                 *
                 * @param {Dom} $target - DOM 객체
                 */
                setKeyboardEvent($target: Dom): void {
                    $target.on('keydown', (e: KeyboardEvent) => {
                        if (e.key == 'ArrowDown' || e.key == 'ArrowUp' || e.key == 'Enter' || e.key == ' ') {
                            if (this.isExpand() == false) {
                                if (e.key == 'Enter' && this.expandOnEnter == false) {
                                    return;
                                }
                                this.expand();
                            } else {
                                this.getList().$getComponent().getEl().dispatchEvent(new KeyboardEvent('keydown', e));
                            }
                            e.preventDefault();
                            e.stopPropagation();
                        }

                        if (e.key == 'Escape') {
                            if (this.isExpand() == true) {
                                this.collapse();
                                e.preventDefault();
                                e.stopPropagation();
                            }
                        }

                        if (e.key == 'Enter') {
                            if (this.isExpand() == false) {
                                return;
                            }
                            this.$getButton().focus();
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    });
                }

                /**
                 * 선택목록을 확장한다.
                 */
                async expand(): Promise<void> {
                    if (this.isExpand() == true) {
                        return;
                    }

                    if (this.matchingValue !== null) {
                        await this.matchingValue;
                    }

                    this.getAbsolute().show();
                    this.loading.hide();

                    this.getList().resetSelections();

                    const value = this.value;

                    if (value !== null) {
                        if (Array.isArray(value) == true) {
                            const promises: Promise<number | number[]>[] = [];
                            for (const v of value) {
                                promises.push(this.getValueToIndex(v));
                            }
                            Promise.all(promises).then((results) => {
                                let lastIndex: number | number[] = null;
                                for (const index of results) {
                                    if (index !== null) {
                                        this.select(index);
                                    }

                                    lastIndex = index;
                                }

                                if (lastIndex !== null) {
                                    if (Array.isArray(lastIndex) == true) {
                                        (this.getList() as Aui.Tree.Panel).focusRow(lastIndex as number[]);
                                    } else {
                                        (this.getList() as Aui.Grid.Panel).focusRow(lastIndex as number);
                                    }
                                }

                                this.fireEvent('expand', [this]);
                            });
                        } else {
                            this.getValueToIndex(value).then((index) => {
                                if (index !== null) {
                                    this.select(index);
                                }

                                if (Array.isArray(index) == true) {
                                    (this.getList() as Aui.Tree.Panel).focusCell(index as number[], 0);
                                } else {
                                    (this.getList() as Aui.Grid.Panel).focusCell(index as number, 0);
                                }

                                this.fireEvent('expand', [this]);
                            });
                        }
                    }
                }

                /**
                 * 검색중인 상태인 경우 검색폼을 활성화한다.
                 */
                searchingMode(): void {
                    if (this.searching == true) {
                        this.$getDisplay().hide();
                        if (this.$search.getValue()?.length == 0) {
                            this.$getEmptyText().show();
                        } else {
                            this.$getEmptyText().hide();
                        }
                    } else {
                        if (this.getValue() !== null || this.emptyText == null) {
                            this.$getDisplay().show();
                            this.$getEmptyText().hide();
                        } else {
                            this.$getDisplay().hide();
                            this.$getEmptyText().show();
                        }
                    }
                }

                /**
                 * 선택목록을 최소화한다.
                 */
                collapse(): void {
                    if (this.isExpand() == true) {
                        this.getAbsolute().hide();
                    }
                }

                /**
                 * 선택목록이 확장되어 있는지 확인한다.
                 *
                 * @return {boolean} isExpand
                 */
                isExpand(): boolean {
                    return this.getAbsolute().isShow();
                }

                /**
                 * 상황에 따라 필드에 포커스를 적용한다.
                 */
                focus(): void {
                    if (this.search == true) {
                        this.$getSearch().focus();
                    } else {
                        this.$getButton().focus();
                    }
                }

                /**
                 * 선택항목을 검색한다.
                 *
                 * @param {string} keyword - 검색어
                 */
                match(keyword: string): void {
                    if ((this.getStore().getFilter(this.searchField)?.value ?? '') === (keyword ?? '')) {
                        return;
                    }

                    if (keyword.length > 0) {
                        if (this.value === null) {
                            this.$getEmptyText().hide();
                        }
                    } else {
                        if (this.value === null) {
                            this.$getEmptyText().show();
                        }
                    }

                    this.getStore().setFilter(this.searchField, keyword, this.searchOperator);
                }

                /**
                 * 필드 비활성화여부를 설정한다.
                 *
                 * @param {boolean} disabled - 비활성화여부
                 * @return {this} this
                 */
                setDisabled(disabled: boolean): this {
                    if (disabled == true) {
                        this.collapse();
                        this.$getButton().setAttr('disabled', 'disabled');
                        if (this.search === true) {
                            this.$getSearch().setAttr('disabled', 'disabled');
                        }
                    } else if (this.readonly === false) {
                        this.$getButton().removeAttr('disabled');
                        if (this.search === true) {
                            this.$getSearch().removeAttr('disabled');
                        }
                    }

                    super.setDisabled(disabled);

                    return this;
                }

                /**
                 * 필드를 랜더링한다.
                 */
                renderContent(): void {
                    if (this.search === true) {
                        const $search = this.$getSearch();
                        this.$getContent().append($search);
                    }

                    const $button = this.$getButton();
                    this.$getContent().append($button);

                    const $emptyText = this.$getEmptyText();
                    $emptyText.html(this.emptyText ?? '');
                    this.$getContent().append($emptyText);
                }

                /**
                 * 필드가 랜더링되었을 때 이벤트를 처리한다.
                 */
                onRender(): void {
                    if (this.oValue !== undefined && this.value === undefined) {
                        this.setValue(this.oValue, true).then(() => {
                            this.oValue = undefined;
                            super.onRender();
                        });
                    } else {
                        this.matchingValue = null;
                        super.onRender();
                    }
                }

                /**
                 * 셀렉트폼의 목록 데이터를 로딩하기전 이벤트를 처리한다.
                 */
                onBeforeLoad(): void {
                    if (this.isExpand() == false) {
                        this.loading.show();
                    }
                    this.getForm()?.setLoading(this, true, false);
                    this.fireEvent('beforeLoad', [this.getStore(), this]);
                }

                /**
                 * 셀렉트폼의 목록 데이터가 로딩되었을 때 이벤트를 처리한다.
                 */
                onLoad(): void {
                    this.loading.hide();

                    if (Format.isEqual(this.storeParams, this.getStore().getCurrentParams()) == false) {
                        this.storeParams = this.getStore().getCurrentParams();

                        if (this.matchingValue !== null) {
                            this.matchingValue.then(() => {
                                if (this.rawValue !== null) {
                                    this.setValue(this.rawValue);
                                }
                            });
                        } else if (this.rawValue !== null) {
                            this.setValue(this.rawValue);
                        }
                    }

                    this.getForm()?.setLoading(this, false);
                    this.fireEvent('load', [this.getStore(), this]);
                }

                /**
                 * 셀렉트폼의 목록 데이터가 변경되었을 때 이벤트를 처리한다.
                 */
                onUpdate(): void {
                    this.fireEvent('update', [this.getStore(), this]);
                }

                /**
                 * 포커스가 지정되었을 때 이벤트를 처리한다.
                 */
                onFocus(): void {
                    if (this.expandOnFocus === true) {
                        this.expand();
                    }
                    super.onFocus();
                }

                /**
                 * 포커스가 해제되었을 때 이벤트를 처리한다.
                 */
                async onBlur(): Promise<void> {
                    if (this.isExpand() == true) {
                        return;
                    }

                    if (this.searching == true) {
                        return;
                    }

                    this.fireEvent('blur', [this]);
                }

                /**
                 * 컴포넌트를 제거한다.
                 */
                remove(): void {
                    this.getAbsolute().remove();
                    this.getList().remove();
                    super.remove();
                }
            }

            export namespace TextArea {
                export interface Properties extends Aui.Form.Field.Base.Properties {
                    /**
                     * @type {number} rows - textarea 의 라인수
                     */
                    rows?: number;

                    /**
                     * @type {boolean} autoHeight - textarea 높이를 자동으로 조절할지 여부
                     */
                    autoHeight?: boolean;

                    /**
                     * @type {string} emptyText - 필드값이 없을 경우 보일 placeHolder
                     */
                    emptyText?: string;

                    /**
                     * @type {boolean} is_trim - 데이터값의 앞뒤 공백을 제거할지 여부 (기본값 TRUE)
                     */
                    is_trim?: boolean;

                    /**
                     * @type {boolean} is_trim - 빈값일 경우 NULL 을 반환할지 여부 (기본값 FALSE)
                     */
                    is_null?: boolean;
                }
            }

            export class TextArea extends Aui.Form.Field.Base {
                field: string = 'textarea';
                rows: number;
                autoHeight: boolean;
                emptyText: string;
                is_trim: boolean;
                is_null: boolean;

                latestLength: number = 0;

                $input: Dom;
                $emptyText: Dom;

                /**
                 * 텍스트에리어필드 클래스 생성한다.
                 *
                 * @param {Aui.Form.Field.TextArea.Properties} properties - 객체설정
                 */
                constructor(properties: Aui.Form.Field.TextArea.Properties = null) {
                    super(properties);

                    this.rows = this.properties.rows ?? 5;
                    this.autoHeight = this.properties.autoHeight ?? true;
                    this.emptyText = this.properties.emptyText ?? '';
                    this.emptyText = this.emptyText.length == 0 ? null : this.emptyText;
                    this.is_trim = this.properties.is_trim !== false;
                    this.is_null = this.properties.is_null === true;

                    this.scrollable = 'Y';
                    this.$scrollable = this.$getInput();
                }

                /**
                 * INPUT 필드 DOM 을 가져온다.
                 *
                 * @return {Dom} $input
                 */
                $getInput(): Dom {
                    if (this.$input === undefined) {
                        this.$input = Html.create('textarea', {
                            name: this.inputName,
                            rows: this.rows.toString(),
                        });
                        if (this.readonly == true) {
                            this.$input.setAttr('readonly', 'readonly');
                        }
                        this.$input.on('input', (e: InputEvent) => {
                            const input = e.currentTarget as HTMLTextAreaElement;
                            if (this.autoHeight == true) {
                                this.updateHeight();
                            }
                            this.setValue(input.value);
                        });
                        if (this.autoHeight == true) {
                            this.$input.on('change', () => {
                                this.updateHeight();
                            });
                        }
                    }

                    return this.$input;
                }

                /**
                 * placeHolder DOM 객체를 가져온다.
                 *
                 * @return {Dom} $emptyText
                 */
                $getEmptyText(): Dom {
                    if (this.$emptyText === undefined) {
                        this.$emptyText = Html.create('div', { 'data-role': 'empty' });
                    }

                    return this.$emptyText;
                }

                /**
                 * INPUT 필드의 높이를 콘텐츠에 따라 갱신한다.
                 */
                updateHeight(): void {
                    if (this.latestLength <= this.$getInput().getValue().length) {
                        this.$getInput().setStyle('height', this.$getInput().getScrollHeight(true) + 'px');
                    } else {
                        this.$getContent().setStyle('height', this.$getContent().getHeight() + 'px');
                        this.$getInput().setStyle('height', null);
                        this.$getInput().setStyle('height', this.$getInput().getScrollHeight(true) + 'px');
                        this.$getContent().setStyle('height', null);
                    }
                    this.latestLength = this.$getInput().getValue().length;
                }

                /**
                 * placeHolder 문자열을 설정한다.
                 *
                 * @param {string} emptyText - placeHolder (NULL 인 경우 표시하지 않음)
                 */
                setEmptyText(emptyText: string = null): void {
                    this.emptyText = emptyText === null || emptyText.length == 0 ? null : emptyText;

                    if (this.isRendered() == true) {
                        this.updateLayout();
                    }
                }

                /**
                 * 필드 비활성화여부를 설정한다.
                 *
                 * @param {boolean} disabled - 비활성여부
                 * @return {Aui.Form.Field.TextArea} this
                 */
                setDisabled(disabled: boolean): this {
                    if (disabled == true) {
                        this.$getInput().setAttr('disabled', 'disabled');
                    } else {
                        this.$getInput().removeAttr('disabled');
                    }

                    super.setDisabled(disabled);

                    return this;
                }

                /**
                 * 필드에 포커스를 지정한다.
                 */
                focus(): void {
                    this.$getInput().focus();
                }

                /**
                 * 필드에 포커스를 해제한다.
                 */
                blur(): void {
                    this.$getInput().blur();
                }

                /**
                 * 필드값을 지정한다.
                 *
                 * @param {any} value - 값
                 * @param {boolean} is_origin - 원본값 변경여부
                 */
                setValue(value: any, is_origin: boolean = false): void {
                    value = value?.toString() ?? '';
                    if (this.$getInput().getValue() != value) {
                        this.$getInput().setValue(value);
                    }

                    if (value.length > 0) {
                        this.$getEmptyText().hide();
                    } else {
                        this.$getEmptyText().show();
                    }

                    super.setValue(value, is_origin);
                }

                /**
                 * 필드값을 가져온다.
                 *
                 * @return {any} value - 값
                 */
                getValue(): any {
                    let value = this.value ?? null;
                    if (value !== null && this.is_trim == true) {
                        value = value.trim();
                    }

                    if (value === null || (this.is_null == true && value.length == 0)) {
                        return null;
                    }

                    return value;
                }

                /**
                 * 필드태그를 랜더링한다.
                 */
                renderContent(): void {
                    const $input = this.$getInput();
                    this.$getContent().append($input);
                }

                /**
                 * 필드 레이아웃을 업데이트한다.
                 */
                updateLayout(): void {
                    super.updateLayout();

                    if (this.properties.emptyText !== null) {
                        const $emptyText = this.$getEmptyText();
                        $emptyText.html(this.emptyText);
                        this.$getContent().append($emptyText);
                    } else {
                        this.$getEmptyText().remove();
                    }
                }
            }

            export namespace Editor {
                export interface Listeners extends Aui.Form.Field.Base.Listeners {
                    /**
                     * @type {Function} editorRender - 에디터가 랜더링되었을 때
                     */
                    editorRender?: (editor: modules.wysiwyg.Editor) => void;

                    /**
                     * @type {Function} editorRender - 에디터의 데이터가 변경되었을 때 (10초 간격)
                     */
                    edit?: (field: Aui.Form.Field.Editor, value: { content: string; attachments: string[] }) => void;
                }

                export interface Properties extends Aui.Form.Field.Base.Properties {
                    /**
                     * @type {string} emptyText - 필드값이 없을 경우 보일 placeHolder
                     */
                    emptyText?: string;

                    /**
                     * @type {number} minHeight - 에디터최소높이
                     */
                    editorHeight?: number;

                    /**
                     * @type {number} editorMaxHeight - 에디터최대높이
                     */
                    editorMaxHeight?: number;

                    /**
                     * @type {boolean} hiddenFiles - 파일목록을 숨길지 여부
                     */
                    hiddenFiles?: boolean;

                    /**
                     * @type {string[]} toolbars - 툴바
                     */
                    toolbars?: string[];

                    /**
                     * @type {boolean} fileUpload - 파일업로드여부
                     */
                    fileUpload?: boolean;

                    /**
                     * @type {boolean} imageUpload - 이미지업로드여부
                     */
                    imageUpload?: boolean;

                    /**
                     * @type {boolean} videoUpload - 비디오업로드여부
                     */
                    videoUpload?: boolean;

                    /**
                     * @type {Aui.Form.Field.Editor.Listeners} listeners - 이벤트리스너
                     */
                    listeners?: Aui.Form.Field.Editor.Listeners;
                }
            }

            export class Editor extends Aui.Form.Field.Base {
                field: string = 'editor';
                rows: number;
                emptyText: string;

                $input: Dom;
                $emptyText: Dom;

                editorHeight: number;
                editorMaxHeight: number;

                editor: modules.wysiwyg.Editor;
                editorRendered: boolean = false;
                uploader: modules.attachment.Uploader;
                fileUpload: boolean;
                imageUpload: boolean;
                videoUpload: boolean;
                $files: Dom;
                toolbars: string[];
                hiddenFiles: boolean;

                /**
                 * 에디터 클래스 생성한다.
                 *
                 * @param {Aui.Form.Field.Editor.Properties} properties - 객체설정
                 */
                constructor(properties: Aui.Form.Field.Editor.Properties = null) {
                    super(properties);

                    this.emptyText = this.properties.emptyText ?? '';
                    this.emptyText = this.emptyText.length == 0 ? null : this.emptyText;
                    this.editorHeight = this.properties.editorHeight ?? 150;
                    this.editorMaxHeight = this.properties.editorMaxHeight ?? null;
                    this.toolbars = this.properties.toolbars ?? null;
                    this.fileUpload = this.properties.fileUpload ?? true;
                    this.imageUpload = this.properties.imageUpload ?? true;
                    this.videoUpload = this.properties.videoUpload ?? true;
                    this.hiddenFiles = this.properties.hiddenFiles === true;
                }

                /**
                 * INPUT 필드 DOM 을 가져온다.
                 *
                 * @return {Dom} $input
                 */
                $getInput(): Dom {
                    if (this.$input === undefined) {
                        this.$input = Html.create('textarea', {
                            name: this.inputName,
                        });

                        this.$input.on('edit', () => {
                            this.fireEvent('edit', [this, this.getValue()]);
                        });

                        this.$input.on('editorFocus', () => {
                            this.onFocus();
                        });

                        this.$input.on('editorBlur', () => {
                            this.onBlur();
                        });
                    }

                    return this.$input;
                }

                /**
                 * 파일목록 DOM 을 가져온다.
                 *
                 * @return {Dom} $files
                 */
                $getFiles(): Dom {
                    if (this.$files === undefined) {
                        this.$files = Html.create('ul', { 'data-role': 'files' });
                    }

                    if (this.hiddenFiles == true) {
                        this.$files.hide();
                    }

                    return this.$files;
                }

                /**
                 * 에디터를 가져온다.
                 *
                 * @return {modules.wysiwyg.Editor} editor
                 */
                getEditor(): modules.wysiwyg.Editor {
                    if (this.editor === undefined) {
                        if (this.isRendered() == false) {
                            this.renderContent();
                        }

                        this.editor = new modules.wysiwyg.Editor(this.$getInput(), {
                            id: this.id + '-Editor',
                            height: this.editorHeight,
                            maxHeight: this.editorMaxHeight,
                            toolbars: this.toolbars,
                            fileUpload: this.fileUpload,
                            imageUpload: this.imageUpload,
                            videoUpload: this.videoUpload,
                            uploader: this.getUploader(),
                            listeners: {
                                render: (editor) => {
                                    this.fireEvent('editorRender', [editor]);
                                },
                            },
                        });
                    }

                    return this.editor;
                }

                /**
                 * 업로더를 가져온다.
                 *
                 * @returns {modules.attachment.Uploader} uploader
                 */
                getUploader(): modules.attachment.Uploader {
                    if (this.uploader === undefined) {
                        if (this.fileUpload || this.imageUpload || this.videoUpload) {
                            this.uploader = new modules.attachment.Uploader(this.$getContent(), {
                                multiple: true,
                                listeners: {
                                    start: () => {
                                        this.onUploadstart();
                                    },
                                    complete: () => {
                                        this.onUploadComplete();
                                    },
                                },
                            });
                        } else {
                            this.uploader = null;
                        }
                    }

                    return this.uploader;
                }

                /**
                 * 필드 비활성화여부를 설정한다.
                 *
                 * @param {boolean} disabled - 비활성여부
                 * @return {Aui.Form.Field.TextArea} this
                 */
                setDisabled(disabled: boolean): this {
                    this.getEditor().setDisabled(disabled);

                    return this;
                }

                /**
                 * 필드값을 지정한다.
                 *
                 * @param {Object} value - 값
                 * @param {boolean} is_origin - 원본값 변경여부
                 */
                setValue(value: { content: string; attachments: string[] }, is_origin: boolean = false): void {
                    this.getEditor().setValue(value);
                    super.setValue(value, is_origin);
                }

                /**
                 * 필드값을 가져온다.
                 *
                 * @return {Object} value - 값
                 */
                getValue(): { content: string; attachments: string[] } {
                    return this.getEditor().getValue();
                }

                /**
                 * 필드에 포커스를 지정한다.
                 */
                focus(): void {
                    this.getEditor().focus();
                    this.onFocus();
                }

                /**
                 * 에디터의 최소높이를 설정한다.
                 *
                 * @param {number} editorHeight - 에디터최소높이
                 * @param {boolean} includedToolbar - 툴바높이를 포함하여 계산할지 여부
                 */
                setEditorHeight(editorHeight: number, includedToolbar: boolean): void {
                    this.getEditor().setHeight(editorHeight, includedToolbar);
                }

                /**
                 * 에디터의 최대높이를 설정한다.
                 *
                 * @param {number} editorMaxHeight - 에디터최소높이
                 * @param {boolean} includedToolbar - 툴바높이를 포함하여 계산할지 여부
                 */
                setEditorMaxHeight(editorMaxHeight: number, includedToolbar: boolean): void {
                    this.getEditor().setMaxHeight(editorMaxHeight, includedToolbar);
                }

                /**
                 * 필드태그를 랜더링한다.
                 */
                renderContent(): void {
                    if (this.editorRendered == false) {
                        this.editorRendered = true;
                        this.$getContent().append(this.$getInput());
                        this.$getContent().append(this.$getFiles());
                    }
                }

                /**
                 * 필드 레이아웃을 업데이트한다.
                 */
                updateLayout(): void {
                    super.updateLayout();
                }

                /**
                 * 필드를 랜더링한다.
                 */
                render(): void {
                    this.$getContent()
                        .setAttr('data-module', 'wysiwyg')
                        .setAttr('data-id', this.id + '-Editor');
                    this.getEditor();

                    super.render();

                    let sticky = '0px';
                    let parent = this.getParent();
                    while (parent !== null) {
                        if (parent.getScroll() !== null) {
                            sticky = parent.$getContent()?.getStyle('padding-top') ?? '0px';
                            break;
                        }

                        parent = parent.getParent();
                    }

                    this.$getContent().setStyleProperty('--im-wysiwyg-toolbar-sticky-height', sticky);
                }

                /**
                 * 업로드 시작이벤트를 처리한다.
                 */
                onUploadstart(): void {
                    this.getForm().setLoading(this, true);
                }

                /**
                 * 업로드 종료이벤트를 처리한다.
                 */
                onUploadComplete(): void {
                    this.getForm().setLoading(this, false);
                }
            }

            export namespace Explorer {
                export interface Properties extends Aui.Form.Field.Base.Properties {
                    /**
                     * @type {string} explorerUrl - 탐색기 URL
                     */
                    explorerUrl: string;

                    /**
                     * @type {number} height - 탐색기높이
                     */
                    height?: number;
                }
            }

            export class Explorer extends Aui.Form.Field.Base {
                field: string = 'explorer';

                explorer: Aui.Explorer;
                explorerUrl: string;
                explorerHeight: string | number;

                /**
                 * 텍스트필드 클래스 생성한다.
                 *
                 * @param {Aui.Form.Field.Explorer.Properties} properties - 객체설정
                 */
                constructor(properties: Aui.Form.Field.Explorer.Properties = null) {
                    super(properties);

                    this.explorerUrl = this.properties.explorerUrl;
                    this.explorerHeight = this.height ?? 299;
                    this.height = null;
                }

                getExplorer(): Aui.Explorer {
                    if (this.explorer === undefined) {
                        this.explorer = new Aui.Explorer({
                            border: true,
                            height: this.explorerHeight,
                            explorerUrl: this.explorerUrl,
                        });
                    }
                    return this.explorer;
                }

                /**
                 * 필드값을 지정한다.
                 *
                 * @param {any} value - 값
                 * @param {boolean} is_origin - 원본값 변경여부
                 */
                setValue(value: any, is_origin: boolean = false): void {
                    value = null;

                    super.setValue(value, is_origin);
                }

                /**
                 * 필드값을 가져온다..
                 *
                 * @return {any} value - 값
                 */
                getValue(): any {
                    return null;
                }

                /**
                 * 필드를 랜더링한다.
                 */
                renderContent(): void {
                    this.$getContent().append(this.getExplorer().$getComponent());
                    this.getExplorer().render();
                }
            }

            export namespace Check {
                export interface Properties extends Aui.Form.Field.Base.Properties {
                    /**
                     * @type {string} boxLabel - 선택항목명
                     */
                    boxLabel?: string;

                    /**
                     * @type {string} onValue - 선택시 전송될 값
                     */
                    onValue?: string;

                    /**
                     * @type {string} offValue - 미선택시 전송될 값
                     */
                    offValue?: string;

                    /**
                     * @type {boolean} checked - 선택여부
                     */
                    checked?: boolean;

                    /**
                     * @type {'input'|'box'} displayType - 선택항목 출력방식
                     */
                    displayType?: 'input' | 'box';
                }
            }

            export class Check extends Aui.Form.Field.Base {
                field: string = 'check';
                boxLabel: string;
                onValue: string;
                offValue: string;
                checked: boolean;
                displayType: 'input' | 'box';

                $input: Dom;
                $label: Dom;
                $boxLabel: Dom;

                /**
                 * 체크박스필드 클래스 생성한다.
                 *
                 * @param {Aui.Form.Field.Check.Properties} properties - 객체설정
                 */
                constructor(properties: Aui.Form.Field.Check.Properties = null) {
                    super(properties);

                    this.boxLabel = this.properties.boxLabel ?? '';
                    this.onValue = this.properties.onValue ?? 'ON';
                    this.offValue = this.properties.offValue ?? null;
                    this.checked = this.properties.checked ?? false;
                    this.displayType = this.properties.displayType ?? 'input';
                }

                /**
                 * INPUT 필드 DOM 을 가져온다.
                 *
                 * @return {Dom} $input
                 */
                $getInput(): Dom {
                    if (this.$input === undefined) {
                        this.$input = Html.create('input', {
                            name: this.inputName,
                            type: 'checkbox',
                            value: this.onValue,
                        });

                        if (this.readonly === true) {
                            this.$input.setAttr('disabled', 'disabled');
                        }

                        this.$input.on('input', (e: InputEvent) => {
                            const input = e.currentTarget as HTMLInputElement;
                            this.setValue(input.checked);
                        });
                    }

                    return this.$input;
                }

                /**
                 * LABEL DOM 을 가져온다.
                 *
                 * @return {Dom} $label
                 */
                $getLabel(): Dom {
                    if (this.$label === undefined) {
                        this.$label = Html.create('label', { class: this.displayType });
                    }

                    return this.$label;
                }

                /**
                 * 필드 비활성화여부를 설정한다.
                 *
                 * @param {boolean} disabled - 비활성화여부
                 * @return {this} this
                 */
                setDisabled(disabled: boolean): this {
                    if (disabled == true) {
                        this.$getInput().setAttr('disabled', 'disabled');
                    } else if (this.readonly === false) {
                        this.$getInput().removeAttr('disabled');
                    }

                    super.setDisabled(disabled);

                    return this;
                }

                /**
                 * INPUT 박스라벨 DOM 을 가져온다.
                 *
                 * @return {Dom} $boxLabel
                 */
                $getBoxLabel(): Dom {
                    if (this.$boxLabel === undefined) {
                        this.$boxLabel = Html.create('span');
                    }

                    return this.$boxLabel;
                }

                /**
                 * 박스라벨 텍스트를 설정한다.
                 *
                 * @param {string} boxLabel - 박스라벨 텍스트
                 */
                setBoxLabel(boxLabel: string): void {
                    this.boxLabel = boxLabel ?? '';
                    this.updateLayout();
                }

                /**
                 * 필드값을 지정한다.
                 *
                 * @param {any} value - 값
                 * @param {boolean} is_origin - 원본값 변경여부
                 */
                setValue(value: any, is_origin: boolean = false): void {
                    this.$getInput().setValue(value);
                    this.checked = this.getValue();
                    super.setValue(this.checked, is_origin);
                }

                /**
                 * 필드값을 가져온다.
                 *
                 * @return {any} value - 값
                 */
                getValue(): boolean {
                    const input = this.$getInput().getEl() as HTMLInputElement;
                    return input.checked;
                }

                /**
                 * 모든 필드값을 가져온다.
                 *
                 * @return {any} value - 값
                 */
                getValues(): { [key: string]: any } {
                    const values: { [key: string]: any } = {};
                    if (this.inputName === null || this.isDisabled() == true) {
                        return values;
                    }

                    if (this.getRawValue() !== null) {
                        values[this.inputName] = this.getRawValue();
                    }

                    return values;
                }

                /**
                 * 필드값을 가져온다.
                 *
                 * @return {any} value - 값
                 */
                getRawValue(): string {
                    return this.getValue() === true ? this.onValue : this.offValue;
                }

                /**
                 * 필드태그를 랜더링한다.
                 */
                renderContent(): void {
                    const $label = this.$getLabel();
                    const $input = this.$getInput();
                    $label.append($input);

                    const $boxLabel = this.$getBoxLabel();
                    $boxLabel.html(this.boxLabel);
                    $label.append($boxLabel);

                    this.$getContent().append($label);
                }

                /**
                 * 필드가 랜더링이 완료되었을 때 이벤트를 처리한다.
                 */
                onRender(): void {
                    if (this.checked === true) {
                        this.setValue(this.checked);
                    }

                    super.onRender();
                }

                /**
                 * 필드 레이아웃을 업데이트한다.
                 */
                updateLayout(): void {
                    super.updateLayout();
                    this.$getBoxLabel().html(this.boxLabel);
                }
            }

            export namespace CheckGroup {
                export interface Properties extends Aui.Form.Field.Base.Properties {
                    /**
                     * @type {number} columns - 한줄당 표시될 선택항목 갯수
                     */
                    columns?: number;

                    /**
                     * @type {string} options - 선택항목
                     */
                    options: { [onValue: string]: string };

                    /**
                     * @type {'input'|'box'} displayType - 선택항목 출력방식
                     */
                    displayType?: 'input' | 'box';

                    /**
                     * @type {string} inputStyle - 선택항목 스타일
                     */
                    inputStyle?: string;

                    /**
                     * @type {string} inputClass - 선택항목 필드 스타일시트
                     */
                    inputClass?: string;
                }
            }

            export class CheckGroup extends Aui.Form.Field.Base {
                field: string = 'checkgroup';
                columns: number;
                options: { [key: string]: string };

                $inputs: Dom;

                /**
                 * 체크박스그룹필드 클래스 생성한다.
                 *
                 * @param {Aui.Form.Field.CheckGroup.Properties} properties - 객체설정
                 */
                constructor(properties: Aui.Form.Field.CheckGroup.Properties = null) {
                    super(properties);

                    this.columns = this.properties.columns ?? 1;
                    this.options = this.properties.options ?? {};
                }

                /**
                 * 폼 패널의 하위 컴포넌트를 정의한다.
                 */
                initItems(): void {
                    if (this.items === null) {
                        this.items = [];

                        for (const value in this.options) {
                            this.items.push(
                                new Aui.Form.Field.Check({
                                    inputName: (this.name ?? this.inputName) + '[]',
                                    onValue: value,
                                    checked: this.value?.includes(value),
                                    readonly: this.readonly,
                                    boxLabel: this.options[value],
                                    displayType: this.properties.displayType ?? 'input',
                                    style: this.properties.inputStyle ?? null,
                                    fieldClass: this.properties.inputClass ?? null,
                                    listeners: {
                                        change: () => {
                                            this.setValue(this.getValue());
                                        },
                                    },
                                })
                            );
                        }
                    }

                    super.initItems();
                }

                /**
                 * 선택항목이 추가될 DOM 객체를 가져온다.
                 *
                 * @return {Dom} $inputs
                 */
                $getInputs(): Dom {
                    if (this.$inputs === undefined) {
                        this.$inputs = Html.create('div', { 'data-role': 'inputs' });
                        this.$inputs.setStyle('grid-template-columns', 'repeat(' + this.columns + ', 1fr)');
                    }

                    return this.$inputs;
                }

                /**
                 * 옵션값을 추가한다.
                 *
                 * @param {string} value - 값
                 * @param {string} display - 표시될 값
                 * @param {Object} properties - 설정
                 */
                addOption(value: string, display: string, properties: { [key: string]: any } = null): void {
                    if (this.options[value] === undefined) {
                        this.options[value] = display;
                        this.append(
                            new Aui.Form.Field.Check({
                                inputName: (this.name ?? this.inputName) + '[]',
                                onValue: value,
                                checked: properties?.checked ?? false,
                                readonly: properties?.readonly ?? this.readonly,
                                boxLabel: display,
                                displayType: this.properties.displayType ?? 'input',
                                style: this.properties.inputStyle ?? null,
                                fieldClass: this.properties.inputClass ?? null,
                                listeners: {
                                    change: () => {
                                        this.setValue(this.getValue());
                                    },
                                },
                            })
                        );
                    }
                }

                /**
                 * 자식 컴포넌트를 추가한다.
                 *
                 * @param {Aui.Component} item - 추가할 컴포넌트
                 * @param {number} position - 추가할 위치 (NULL 인 경우 제일 마지막 위치)
                 */
                append(item: Aui.Component, position: number = null): void {
                    if (this.items === null) {
                        this.items = [];
                    }
                    item.setParent(this);

                    if (position === null || position >= (this.items.length ?? 0)) {
                        this.items.push(item);
                    } else if (position < 0 && Math.abs(position) >= (this.items.length ?? 0)) {
                        this.items.unshift(item);
                    } else {
                        this.items.splice(position, 0, item);
                    }

                    if (this.isRendered() == true) {
                        this.$getInputs().append(item.$getComponent(), position);
                        if (item.isRenderable() == true) {
                            item.render();
                        }
                    }
                }

                /**
                 * 필드값을 지정한다.
                 *
                 * @param {string|string[]} value - 값
                 * @param {boolean} is_origin - 원본값 변경여부
                 */
                setValue(value: string | string[], is_origin: boolean = false): void {
                    if (typeof value == 'string') {
                        value = [value];
                    }

                    if (value !== null) {
                        this.items.forEach((item: Aui.Form.Field.Check) => {
                            if (value.includes(item.onValue) == true && item.getValue() == false) {
                                item.setValue(true);
                            }

                            if (value.includes(item.onValue) == false && item.getValue() == true) {
                                item.setValue(false);
                            }
                        });
                    }

                    super.setValue(this.getValue(), is_origin);
                }

                /**
                 * 필드값을 가져온다.
                 *
                 * @return {string[]} value - 값
                 */
                getValue(): string[] {
                    const value = [];
                    this.items.forEach((item: Aui.Form.Field.Check) => {
                        if (item.isDisabled() == false && item.getRawValue() !== null) {
                            value.push(item.getRawValue());
                        }
                    });

                    return value.length == 0 ? null : value;
                }

                /**
                 * 필드 비활성화여부를 설정한다.
                 *
                 * @param {boolean} disabled - 비활성화여부
                 * @return {this} this
                 */
                setDisabled(disabled: boolean): this {
                    this.items.forEach((item: Aui.Form.Field.Check) => {
                        item.setDisabled(disabled);
                    });

                    super.setDisabled(disabled);

                    return this;
                }

                /**
                 * 필드를 랜더링한다.
                 */
                renderContent(): void {
                    const $content = this.$getContent();
                    const $inputs = this.$getInputs();
                    for (const item of this.items) {
                        $inputs.append(item.$getComponent());
                        item.render();
                    }
                    $content.append($inputs);
                }
            }

            export namespace Radio {
                export interface Properties extends Aui.Form.Field.Base.Properties {
                    /**
                     * @type {string} boxLabel - 선택항목명
                     */
                    boxLabel?: string;

                    /**
                     * @type {string} onValue - 선택시 전송될 값
                     */
                    onValue?: string;

                    /**
                     * @type {boolean} checked - 선택여부
                     */
                    checked?: boolean;

                    /**
                     * @type {'input'|'box'} displayType - 선택항목 출력방식
                     */
                    displayType?: 'input' | 'box';
                }
            }

            export class Radio extends Aui.Form.Field.Base {
                field: string = 'radio';
                boxLabel: string;
                onValue: string;
                checked: boolean;
                displayType: 'input' | 'box';

                $input: Dom;
                $label: Dom;
                $boxLabel: Dom;

                /**
                 * 라디오필드 클래스 생성한다.
                 *
                 * @param {Aui.Form.Field.Radio.Properties} properties - 객체설정
                 */
                constructor(properties: Aui.Form.Field.Radio.Properties = null) {
                    super(properties);

                    this.boxLabel = this.properties.boxLabel ?? '';
                    this.onValue = this.properties.onValue ?? 'ON';
                    this.checked = this.properties.checked ?? false;
                    this.displayType = this.properties.displayType ?? 'input';
                }

                /**
                 * INPUT 필드 DOM 을 가져온다.
                 *
                 * @return {Dom} $input
                 */
                $getInput(): Dom {
                    if (this.$input === undefined) {
                        this.$input = Html.create('input', {
                            name: this.inputName,
                            type: 'radio',
                            value: this.onValue,
                        });
                        this.$input.on('input', (e: InputEvent) => {
                            const input = e.currentTarget as HTMLInputElement;
                            this.setValue(input.checked);
                        });
                    }

                    return this.$input;
                }

                /**
                 * LABEL DOM 을 가져온다.
                 *
                 * @return {Dom} $label
                 */
                $getLabel(): Dom {
                    if (this.$label === undefined) {
                        this.$label = Html.create('label', { class: this.displayType });
                    }

                    return this.$label;
                }

                /**
                 * INPUT 박스라벨 DOM 을 가져온다.
                 *
                 * @return {Dom} $boxLabel
                 */
                $getBoxLabel(): Dom {
                    if (this.$boxLabel === undefined) {
                        this.$boxLabel = Html.create('span');
                    }

                    return this.$boxLabel;
                }

                /**
                 * 박스라벨 텍스트를 설정한다.
                 *
                 * @param {string} boxLabel - 박스라벨 텍스트
                 */
                setBoxLabel(boxLabel: string): void {
                    this.boxLabel = boxLabel ?? '';
                    this.updateLayout();
                }

                /**
                 * 필드값을 지정한다.
                 *
                 * @param {any} value - 값
                 * @param {boolean} is_origin - 원본값 변경여부
                 */
                setValue(value: any, is_origin: boolean = false): void {
                    this.$getInput().setValue(value);
                    this.updateChecked();
                    this.checked = this.getValue();
                    super.setValue(this.checked, is_origin);
                }

                /**
                 * 필드값을 지정한다.
                 *
                 * @param {any} value - 값
                 */
                updateValue(value: any): void {
                    this.checked = value;
                    super.setValue(this.checked);
                }

                /**
                 * 필드값을 가져온다.
                 *
                 * @return {any} value - 값
                 */
                getValue(): boolean {
                    return this.$getInput().isChecked();
                }

                /**
                 * 모든 필드값을 가져온다.
                 *
                 * @return {any} value - 값
                 */
                getValues(): { [key: string]: any } {
                    const values: { [key: string]: any } = {};
                    if (this.inputName === null && this.isDisabled() == true) {
                        return values;
                    }

                    if (this.getRawValue() !== null) {
                        values[this.inputName] = this.getRawValue();
                    }

                    return values;
                }

                /**
                 * 필드값을 가져온다.
                 *
                 * @return {any} value - 값
                 */
                getRawValue(): string {
                    return this.getValue() === true ? this.onValue : null;
                }

                /**
                 * 다른 라디오버튼을 클릭함으로써 값이 변경된 경우를 처리한다.
                 */
                updateChecked(): void {
                    if (this.getForm() === null) {
                        return;
                    }

                    Html.all('input[type=radio][name=' + this.inputName + ']', this.getForm().$getContent()).forEach(
                        ($input: Dom) => {
                            const $content = $input.getParents('div[data-role=content][data-field=radio]');
                            const $component = $content?.getParents(
                                'div[data-component][data-type=form][data-role=field]'
                            );
                            if ($component?.getData('component')) {
                                const input = Aui.getComponent($component.getData('component'));
                                if (input instanceof Aui.Form.Field.Radio) {
                                    if (input.checked != $input.isChecked()) {
                                        input.updateValue($input.isChecked());
                                    }
                                }
                            }
                        }
                    );
                }

                /**
                 * 필드태그를 랜더링한다.
                 */
                renderContent(): void {
                    const $label = this.$getLabel();
                    const $input = this.$getInput();
                    $label.append($input);

                    const $boxLabel = this.$getBoxLabel();
                    $boxLabel.html(this.boxLabel);
                    $label.append($boxLabel);

                    this.$getContent().append($label);
                }

                /**
                 * 필드 레이아웃을 업데이트한다.
                 */
                updateLayout(): void {
                    super.updateLayout();
                    this.$getBoxLabel().html(this.boxLabel);
                }
            }

            export namespace RadioGroup {
                export interface Properties extends Aui.Form.Field.Base.Properties {
                    /**
                     * @type {number} columns - 한줄당 표시될 선택항목 갯수
                     */
                    columns?: number;

                    /**
                     * @type {string} options - 선택항목
                     */
                    options: { [onValue: string]: string };

                    /**
                     * @type {'input'|'box'} displayType - 선택항목 출력방식
                     */
                    displayType?: 'input' | 'box';

                    /**
                     * @type {string} inputStyle - 선택항목 스타일
                     */
                    inputStyle?: string;

                    /**
                     * @type {string} inputClass - 선택항목 필드 스타일시트
                     */
                    inputClass?: string;
                }
            }

            export class RadioGroup extends Aui.Form.Field.Base {
                field: string = 'radiogroup';
                columns: number;
                options: { [key: string]: string };

                /**
                 * 라디오그룹필드 클래스 생성한다.
                 *
                 * @param {Aui.Form.Field.RadioGroup.Properties} properties - 객체설정
                 */
                constructor(properties: Aui.Form.Field.RadioGroup.Properties = null) {
                    super(properties);

                    this.columns = this.properties.columns ?? 1;
                    this.options = this.properties.options ?? {};
                    this.scrollable = 'x';
                    this.$scrollable = this.$getContent();
                }

                /**
                 * 폼 패널의 하위 컴포넌트를 정의한다.
                 */
                initItems(): void {
                    if (this.items === null) {
                        this.items = [];

                        for (const value in this.options) {
                            this.items.push(
                                new Aui.Form.Field.Radio({
                                    inputName: this.name ?? this.inputName,
                                    onValue: value,
                                    checked: this.value == value,
                                    boxLabel: this.options[value],
                                    displayType: this.properties.displayType ?? 'input',
                                    style: this.properties.inputStyle ?? null,
                                    fieldClass: this.properties.inputClass ?? null,
                                    listeners: {
                                        change: (field: Aui.Form.Field.Radio, value: boolean) => {
                                            if (value === true) {
                                                this.setValue(field.getRawValue());
                                            }
                                        },
                                    },
                                })
                            );
                        }
                    }

                    super.initItems();
                }

                /**
                 * 필드값을 지정한다.
                 *
                 * @param {string} value - 값
                 * @param {boolean} is_origin - 원본값 변경여부
                 */
                setValue(value: string, is_origin: boolean = false): void {
                    for (const item of this.items as Aui.Form.Field.Radio[]) {
                        if (item.onValue == value && item.getValue() !== true) {
                            item.setValue(true);
                        }
                    }

                    super.setValue(this.getValue(), is_origin);
                }

                /**
                 * 필드값을 가져온다.
                 *
                 * @return {string} value - 값
                 */
                getValue(): string {
                    for (const item of this.items as Aui.Form.Field.Radio[]) {
                        if (item.getRawValue() !== null) {
                            return item.getRawValue();
                        }
                    }

                    return null;
                }

                /**
                 * 모든 필드값을 가져온다.
                 *
                 * @return {any} value - 값
                 */
                getValues(): { [key: string]: any } {
                    const values: { [key: string]: any } = {};
                    if (this.inputName === null && this.isDisabled() == true) {
                        return values;
                    }

                    if (this.getValue() !== null) {
                        values[this.inputName] = this.getValue();
                    }

                    return values;
                }

                /**
                 * 필드를 랜더링한다.
                 */
                renderContent(): void {
                    const $content = this.$getContent();
                    const $inputs = Html.create('div', { 'data-role': 'inputs' });
                    for (const item of this.items) {
                        $inputs.append(item.$getComponent());
                        item.render();
                    }
                    $inputs.setStyle(
                        'grid-template-columns',
                        'repeat(' + Math.min(this.items.length, this.columns) + ', 1fr)'
                    );
                    $content.append($inputs);
                }
            }

            export namespace Permission {
                export interface Properties extends Aui.Form.Field.Base.Properties {
                    /**
                     * @type {string} url - 권한목록을 가져올 URL
                     */
                    url?: string;
                }
            }

            export class Permission extends Aui.Form.Field.Base {
                field: string = 'permission';

                url: string;

                select: Aui.Form.Field.Select;
                check: Aui.Form.Field.Check;
                input: Aui.Form.Field.Text;

                /**
                 * 텍스트필드 클래스 생성한다.
                 *
                 * @param {Aui.Form.Field.Permission.Properties} properties - 객체설정
                 */
                constructor(properties: Aui.Form.Field.Permission.Properties = null) {
                    super(properties);

                    this.url = this.properties.url ?? null;
                }

                /**
                 * 권한 선택폼을 가져온다.
                 *
                 * @return {Aui.Form.Field.Select} select
                 */
                getSelect(): Aui.Form.Field.Select {
                    if (this.select === undefined) {
                        if (this.url === null) {
                            this.select = new Aui.Form.Field.Select({
                                store: new Aui.Store.Local({
                                    fields: ['expression', 'label'],
                                    records: (() => {
                                        const permissions = [
                                            ['true', Aui.printText('permissions.true')],
                                            ['false', Aui.printText('permissions.false')],
                                        ];

                                        return permissions;
                                    })(),
                                    sorters: { sort: 'ASC', label: 'ASC' },
                                }),
                                displayField: 'label',
                                valueField: 'expression',
                                value: 'true',
                                flex: 1,
                            });
                        } else {
                            this.select = new Aui.Form.Field.Select({
                                store: new Aui.Store.Remote({
                                    url: this.url,
                                    sorters: { sort: 'ASC', label: 'ASC' },
                                }),
                                displayField: 'label',
                                valueField: 'expression',
                                value: 'true',
                                flex: 1,
                            });
                        }
                    }

                    return this.select;
                }

                /**
                 * 사용자정의 체크박스를 가져온다.
                 *
                 * @return {Aui.Form.Field.Check} check
                 */
                getCheck(): Aui.Form.Field.Check {
                    if (this.check === undefined) {
                        this.check = new Aui.Form.Field.Check({
                            boxLabel: Aui.printText('permissions.custom'),
                            listeners: {
                                change: (_field, checked) => {
                                    this.getInput().setHidden(!checked);
                                },
                            },
                        });
                    }

                    return this.check;
                }

                /**
                 * 사용자정의 체크박스를 가져온다.
                 *
                 * @return {Aui.Form.Field.Text} input
                 */
                getInput(): Aui.Form.Field.Text {
                    if (this.input === undefined) {
                        this.input = new Aui.Form.Field.Text({
                            hidden: true,
                        });
                    }

                    return this.input;
                }

                /**
                 * 필드값을 지정한다.
                 *
                 * @param {any} value - 값
                 * @param {boolean} is_origin - 원본값 변경여부
                 */
                setValue(value: any, is_origin: boolean = false): void {
                    if (value !== null) {
                        this.getSelect()
                            .getValueToRecord(value)
                            .then((record) => {
                                if (record === null) {
                                    // @todo 사용자정의
                                } else {
                                    this.getSelect().setValue(value);
                                }

                                super.setValue(value, is_origin);
                            });
                    } else {
                        super.setValue(value, is_origin);
                    }
                }

                /**
                 * 필드값을 가져온다..
                 *
                 * @return {any} value - 값
                 */
                getValue(): any {
                    if (this.getCheck().getValue() == true) {
                        return this.getInput().getValue();
                    }

                    return this.getSelect().getValue();
                }

                /**
                 * 필드를 랜더링한다.
                 */
                renderContent(): void {
                    const container = new Aui.Form.Field.Container({
                        direction: 'column',
                        items: [
                            new Aui.Form.Field.Container({
                                direction: 'row',
                                items: [this.getSelect(), this.getCheck()],
                            }),
                            this.getInput(),
                        ],
                    });
                    this.$getContent().append(container.$getComponent());
                    container.render();
                }
            }
        }
    }
}

declare var moment: any;
