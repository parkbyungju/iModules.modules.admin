/**
 * 이 파일은 아이모듈 관리자모듈의 일부입니다. (https://www.imodules.io)
 *
 * 툴바 클래스를 정의한다.
 *
 * @file /modules/admin/scripts/Admin.Toolbar.ts
 * @author Arzz <arzz@arzz.com>
 * @license MIT License
 * @modified 2022. 12. 12.
 */
var Admin;
(function (Admin) {
    class Toolbar extends Admin.Component {
        type = 'toolbar';
        role = 'toolbar';
        position;
        border;
        /**
         * 툴바를 생성한다.
         *
         * @param {Object|Admin.Component[]} properties - 객체설정
         */
        constructor(properties) {
            if (properties?.constructor.name == 'Array') {
                const items = properties;
                properties = { items: items };
            }
            super(properties);
            this.position = this.properties.position ?? 'top';
            this.border = this.properties.border ?? true;
            this.scrollable = this.properties.scrollable ?? 'X';
        }
        /**
         * 툴바의 하위 컴포넌트를 초기화한다.
         */
        initItems() {
            if (this.items === null) {
                this.items = [];
                for (const item of this.properties.items ?? []) {
                    if (item instanceof Admin.Component) {
                        this.items.push(item);
                    }
                    else if (typeof item == 'string') {
                        this.items.push(new Admin.Toolbar.Item(item));
                    }
                }
            }
            super.initItems();
        }
        /**
         * @todo 툴바 좌측 스크롤 버튼을 랜더링한다.
         */
        renderTop() { }
        /**
         * @todo 툴바 우축 스크롤 버튼을 랜더링한다.
         */
        renderBottom() { }
        /**
         * 레이아웃을 렌더링한다.
         */
        render() {
            this.$getContainer().setData('position', this.position);
            if (this.border == true) {
                this.$getContainer().addClass('border');
            }
            super.render();
        }
        /**
         * 툴바위치를 지정한다.
         *
         * @param {string} position (top / bottom)
         */
        setPosition(position) {
            this.position = position;
        }
    }
    Admin.Toolbar = Toolbar;
    (function (Toolbar) {
        /**
         * 툴바아이템 클래스를 정의한다.툴바아이템 객체를 생성한다.
         */
        class Item extends Admin.Component {
            type = 'toolbaritem';
            text;
            $text;
            /**
             * 툴바아이템을 생성한다.
             *
             * @param {Object|string} properties - 객체설정
             */
            constructor(properties) {
                if (typeof properties == 'string') {
                    const text = properties;
                    properties = { text: text };
                }
                super(properties);
                this.role = 'text';
                this.text = this.properties.text ?? '';
                if (this.text == '->') {
                    this.role = 'fill';
                }
                else if (this.text == '-') {
                    this.role = 'separator';
                }
            }
            /**
             * 툴바아이템을 랜더링한다.
             */
            renderContent() {
                if (this.role == 'text') {
                    this.$getContent().text(this.text);
                }
            }
        }
        Toolbar.Item = Item;
    })(Toolbar = Admin.Toolbar || (Admin.Toolbar = {}));
})(Admin || (Admin = {}));
