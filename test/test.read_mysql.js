#!/usr/bin/env node
GLOBAL.DEBUG = true;
var events = require("events");
var sys = require("sys");
var test = require("mjsunit");

var helper = require('./helper');
process.mixin(GLOBAL, helper);
var config = require('./config');
var mysql = require('../lib/mysql');

var conn_close = function(conn, promise) {
    conn.addListener('close', function() {
	promise.emitSuccess();
    });
    conn.close();
}

var all_tests = [];
var test_createConnection = function() {
    var promise = new events.Promise();
    var conn = new mysql.Connection(config.mysql.hostname, 
				    config.mysql.username,
				    config.mysql.password,
				    config.mysql.database);
    helper.exceptClass(mysql.Connection, conn);
    helper.expect_callback();
    conn.connect().addCallback(function() {
	helper.was_called_back();
	conn_close(conn, promise);
    });
    return promise;
};
all_tests.push(test_createConnection);

var test_result1 = function() {
    var promise = new events.Promise();
    var conn = new mysql.Connection(config.mysql.hostname, 
					  config.mysql.username,
					  config.mysql.password,
					  config.mysql.database);
    helper.exceptClass(mysql.Connection, conn);
    conn.connect();
    conn.query('CREATE TEMPORARY TABLE t (id INTEGER, str VARCHAR(10), PRIMARY KEY (id))');
    conn.query("INSERT INTO t VALUES (1,'abc'),(-2,'0'),(3.1,''),(4,null)");
    helper.expect_callback();
    conn.query('SELECT * FROM t').addCallback(function(result) {
	helper.was_called_back();
	test.assertEquals(4, result.records.length);
	
	test.assertEquals(1, result.records[0][0]);
	test.assertEquals('abc', result.records[0][1]); // string
	test.assertEquals(-2, result.records[1][0]);
	test.assertEquals('0', result.records[1][1]); // string
	test.assertEquals(3, result.records[2][0]);
	test.assertEquals('', result.records[2][1]); // blank string
	test.assertEquals(4, result.records[3][0]);
	test.assertEquals(null, result.records[3][1]); // null string
	
	conn_close(conn, promise);
    });
    return promise;
};
all_tests.push(test_result1);

helper.run(all_tests);

/*
var result;
JSpec.describe('Mysql::Result', function(){
    before(function(){
	conn = new mysql.createConnection(config.mysql.hostname, 
					  config.mysql.username,
					  config.mysql.password,
					  config.mysql.database);
	conn.query('create temporary table t (id int, str char(10), primary key (id))');
	conn.query("insert into t values (1,'abc'),(2,'defg'),(3,'hi'),(4,null)");
	result = undefined;
	conn.query('select * from t').addCallback(function(res) {
	    result = res;
	});
    });
    
    after(function(){
	conn.close();
    });
    
    it('get records', function(){
      result.records.size.should.equal(4);
    });
});
/*
    @res.fetch_row.should == ['1', 'abc']
    @res.fetch_row.should == ['2', 'defg']
    @res.fetch_row.should == ['3', 'hi']
    @res.data_seek 1
    @res.fetch_row.should == ['2', 'defg']
  });

  it('#fetch_field return current field', function(){
    f = @res.fetch_field
    f.name.should == 'id'
    f.table.should == 't'
    f.def.should == nil
    f.type.should == Mysql::Field::TYPE_LONG
    f.length.should == 11
    f.max_length == 1
    f.flags.should == Mysql::Field::NUM_FLAG|Mysql::Field::PRI_KEY_FLAG|Mysql::Field::PART_KEY_FLAG|Mysql::Field::NOT_NULL_FLAG
    f.decimals.should == 0

    f = @res.fetch_field
    f.name.should == 'str'
    f.table.should == 't'
    f.def.should == nil
    f.type.should == Mysql::Field::TYPE_STRING
    f.length.should == 10
    f.max_length == 4
    f.flags.should == 0
    f.decimals.should == 0

    @res.fetch_field.should == nil
  });

  it('#fetch_fields returns array of fields', function(){
    ret = @res.fetch_fields
    ret.size.should == 2
    ret[0].name.should == 'id'
    ret[1].name.should == 'str'
  });

  it('#fetch_field_direct returns field', function(){
    f = @res.fetch_field_direct 0
    f.name.should == 'id'
    f = @res.fetch_field_direct 1
    f.name.should == 'str'
    proc{@res.fetch_field_direct -1}.should raise_error Mysql::ClientError, 'invalid argument: -1'
    proc{@res.fetch_field_direct 2}.should raise_error Mysql::ClientError, 'invalid argument: 2'
  });

  it('#fetch_lengths returns array of length of field data', function(){
    @res.fetch_lengths.should == nil
    @res.fetch_row
    @res.fetch_lengths.should == [1, 3]
    @res.fetch_row
    @res.fetch_lengths.should == [1, 4]
    @res.fetch_row
    @res.fetch_lengths.should == [1, 2]
    @res.fetch_row
    @res.fetch_lengths.should == [1, 0]
    @res.fetch_row
    @res.fetch_lengths.should == nil
  });

  it('#fetch_row returns one record as array for current record', function(){
    @res.fetch_row.should == ['1', 'abc']
    @res.fetch_row.should == ['2', 'defg']
    @res.fetch_row.should == ['3', 'hi']
    @res.fetch_row.should == ['4', nil]
    @res.fetch_row.should == nil
  });

  it('#fetch_hash returns one record as hash for current record', function(){
    @res.fetch_hash.should == {'id'=>'1', 'str'=>'abc'}
    @res.fetch_hash.should == {'id'=>'2', 'str'=>'defg'}
    @res.fetch_hash.should == {'id'=>'3', 'str'=>'hi'}
    @res.fetch_hash.should == {'id'=>'4', 'str'=>nil}
    @res.fetch_hash.should == nil
  });

  it('#fetch_hash(true) returns with table name', function(){
    @res.fetch_hash(true).should == {'t.id'=>'1', 't.str'=>'abc'}
    @res.fetch_hash(true).should == {'t.id'=>'2', 't.str'=>'defg'}
    @res.fetch_hash(true).should == {'t.id'=>'3', 't.str'=>'hi'}
    @res.fetch_hash(true).should == {'t.id'=>'4', 't.str'=>nil}
    @res.fetch_hash(true).should == nil
  });

  it('#num_fields returns number of fields', function(){
    @res.num_fields.should == 2
  });

  it('#num_rows returns number of records', function(){
    @res.num_rows.should == 4
  });

  it('#each iterate block with a record', function(){
    expect = [["1","abc"], ["2","defg"], ["3","hi"], ["4",nil]]
    @res.each, function(){ |a|
      a.should == expect.shift
    });
  });

  it('#each_hash iterate block with a hash', function(){
    expect = [{"id"=>"1","str"=>"abc"}, {"id"=>"2","str"=>"defg"}, {"id"=>"3","str"=>"hi"}, {"id"=>"4","str"=>nil}]
    @res.each_hash, function(){ |a|
      a.should == expect.shift
    });
  });

  it('#each_hash(true): hash key has table name', function(){
    expect = [{"t.id"=>"1","t.str"=>"abc"}, {"t.id"=>"2","t.str"=>"defg"}, {"t.id"=>"3","t.str"=>"hi"}, {"t.id"=>"4","t.str"=>nil}]
    @res.each_hash(true), function(){ |a|
      a.should == expect.shift
    });
  });

  it('#row_tell returns position of current record, #row_seek set position of current record', function(){
    @res.fetch_row.should == ['1', 'abc']
    pos = @res.row_tell
    @res.fetch_row.should == ['2', 'defg']
    @res.fetch_row.should == ['3', 'hi']
    @res.row_seek pos
    @res.fetch_row.should == ['2', 'defg']
  });

  it('#field_tell returns position of current field, #field_seek set position of current field', function(){
    @res.field_tell.should == 0
    @res.fetch_field
    @res.field_tell.should == 1
    @res.fetch_field
    @res.field_tell.should == 2
    @res.field_seek 1
    @res.field_tell.should == 1
  });

  it('#free returns nil', function(){
    @res.free.should == nil
  });

  it('#num_fields returns number of fields', function(){
    @res.num_fields.should == 2
  });

  it('#num_rows returns number of records', function(){
    @res.num_rows.should == 4
  });
});

/*
JSpec.describe('Mysql::Field', function(){
  before(function(){
    conn = Mysql.new(MYSQL_SERVER, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_PORT, MYSQL_SOCKET)
    conn.query('create temporary table t (id int default 0, str char(10), primary key (id))');
    conn.query("insert into t values (1,'abc'),(2,'defg'),(3,'hi'),(4,null)");
    @res = conn.query('select * from t');
  });

  after(function(){
    conn.close if conn
  });

  it('#name is name of field', function(){
    @res.fetch_field.name.should == 'id'
  });

  it('#table is name of table for field', function(){
    @res.fetch_field.table.should == 't'
  });

  it('#def for result set is null', function(){
    @res.fetch_field.def.should == nil
  });

  it('#def for field information is default value', function(){
    conn.list_fields('t').fetch_field.def.should == '0'
  });

  it('#type is type of field as Integer', function(){
    @res.fetch_field.type.should == Mysql::Field::TYPE_LONG
    @res.fetch_field.type.should == Mysql::Field::TYPE_STRING
  });

  it('#length is length of field', function(){
    @res.fetch_field.length.should == 11
    @res.fetch_field.length.should == 10
  });

  it('#max_length is maximum length of field value', function(){
    @res.fetch_field.max_length.should == 1
    @res.fetch_field.max_length.should == 4
  });

  it('#flags is flag of field as Integer', function(){
    @res.fetch_field.flags.should == Mysql::Field::NUM_FLAG|Mysql::Field::PRI_KEY_FLAG|Mysql::Field::PART_KEY_FLAG|Mysql::Field::NOT_NULL_FLAG
    @res.fetch_field.flags.should == 0
  });

  it('#decimals is number of decimal digits', function(){
    conn.query('select 1.23').fetch_field.decimals.should == 2
  });

  it('#hash return field as hash', function(){
    @res.fetch_field.hash.should == {
      'name'       => 'id',
      'table'      => 't',
      'def'        => nil,
      'type'       => Mysql::Field::TYPE_LONG,
      'length'     => 11,
      'max_length' => 1,
      'flags'      => Mysql::Field::NUM_FLAG|Mysql::Field::PRI_KEY_FLAG|Mysql::Field::PART_KEY_FLAG|Mysql::Field::NOT_NULL_FLAG,
      'decimals'   => 0,
    }
    @res.fetch_field.hash.should == {
      'name'       => 'str',
      'table'      => 't',
      'def'        => nil,
      'type'       => Mysql::Field::TYPE_STRING,
      'length'     => 10,
      'max_length' => 4,
      'flags'      => 0,
      'decimals'   => 0,
    }
  });

  it('#inspect returns "#<Mysql::Field:name>"', function(){
    @res.fetch_field.inspect.should == '#<Mysql::Field:id>'
    @res.fetch_field.inspect.should == '#<Mysql::Field:str>'
  });

  it('#is_num? returns true if the field is numeric', function(){
    @res.fetch_field.is_num?.should == true
    @res.fetch_field.is_num?.should == false
  });

  it('#is_not_null? returns true if the field is not null', function(){
    @res.fetch_field.is_not_null?.should == true
    @res.fetch_field.is_not_null?.should == false
  });

  it('#is_pri_key? returns true if the field is primary key', function(){
    @res.fetch_field.is_pri_key?.should == true
    @res.fetch_field.is_pri_key?.should == false
  });
});

JSpec.describe('create Mysql::Stmt object:', function(){
  before(function(){
    conn = Mysql.new(MYSQL_SERVER, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_PORT, MYSQL_SOCKET)
  });

  after(function(){
    conn.close if conn
  });

  it('Mysql#stmt_init(returns Mysql::Stmt object', function(){
    conn.stmt_init.should be_kind_of Mysql::Stmt
  });

  it('Mysq;#prepare returns Mysql::Stmt object', function(){
    conn.prepare("select 1").should be_kind_of Mysql::Stmt
  });
});



/*
JSpec.describe('Mysql.escape_string', function(){
  it('escape special character', function(){
    Mysql.escape_string("abc'def\"ghi\0jkl%mno").should == "abc\\'def\\\"ghi\\0jkl%mno"
  });
});

JSpec.describe('Mysql.quote', function(){
  it('escape special character', function(){
    Mysql.quote("abc'def\"ghi\0jkl%mno").should == "abc\\'def\\\"ghi\\0jkl%mno"
  });
});

JSpec.describe('Mysql#options', function(){
  before(function(){
    conn = Mysql.init
  });
  after(function(){
    conn.close
  });
  it('INIT_COMMAND: execute query when connecting', function(){
    conn.options(Mysql::INIT_COMMAND, "SET AUTOCOMMIT=0").should == conn
    conn.connect(MYSQL_SERVER, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_PORT, MYSQL_SOCKET).should == conn
    conn.query('select @@AUTOCOMMIT').fetch_row.should == ["0"]
  });
  it('OPT_CONNECT_TIMEOUT: set timeout for connecting', function(){
    conn.options(Mysql::OPT_CONNECT_TIMEOUT, 0.1).should == conn
    UNIXSocket.stub!(:new).and_return{sleep 1}
    TCPSocket.stub!(:new).and_return{sleep 1}
    proc{conn.connect(MYSQL_SERVER, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_PORT, MYSQL_SOCKET)}.should raise_error Mysql::ClientError, 'connection timeout'
    proc{conn.connect}.should raise_error Mysql::ClientError, 'connection timeout'
  });
  it('OPT_LOCAL_INFILE: client can execute LOAD DATA LOCAL INFILE query', function(){
    tmpf = Tempfile.new 'mysql_spec'
    tmpf.puts "123\tabc\n"
    tmpf.close
    conn.options(Mysql::OPT_LOCAL_INFILE, true).should == conn
    conn.connect(MYSQL_SERVER, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_PORT, MYSQL_SOCKET)
    conn.query('create temporary table t (i int, c char(10))')
    conn.query("load data local infile '#{tmpf.path}' into table t")
    conn.query('select * from t').fetch_row.should == ['123','abc']
  });
  it('OPT_READ_TIMEOUT: set timeout for reading packet', function(){
    conn.options(Mysql::OPT_READ_TIMEOUT, 10).should == conn
  });
  it('OPT_WRITE_TIMEOUT: set timeout for writing packet', function(){
    conn.options(Mysql::OPT_WRITE_TIMEOUT, 10).should == conn
  });
  it('SET_CHARSET_NAME: set charset for connection', function(){
    conn.options(Mysql::SET_CHARSET_NAME, 'utf8').should == conn
    conn.connect(MYSQL_SERVER, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_PORT, MYSQL_SOCKET)
    conn.query('select @@character_set_connection').fetch_row.should == ['utf8']
  });
});

JSpec.describe('Mysql', function(){
  before(function(){
    conn = Mysql.new(MYSQL_SERVER, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_PORT, MYSQL_SOCKET)
  });

  after(function(){
    conn.close if conn rescue nil
  });

  JSpec.describe('#escape_string', function(){
    if defined? ::Encoding
      it('escape special character for charset', function(){
        conn.charset = 'cp932'
        conn.escape_string("abc'def\"ghi\0jkl%mno_表".encode('cp932')).should == "abc\\'def\\\"ghi\\0jkl%mno_表".encode('cp932')
      });
    else
      it('raise error if charset is multibyte', function(){
        conn.charset = 'cp932'
        proc{conn.escape_string("abc'def\"ghi\0jkl%mno_\x95\\")}.should raise_error(Mysql::ClientError, 'Mysql#escape_string is called for unsafe multibyte charset')
      });
      it('not warn if charset is singlebyte', function(){
        conn.charset = 'latin1'
        conn.escape_string("abc'def\"ghi\0jkl%mno_\x95\\").should == "abc\\'def\\\"ghi\\0jkl%mno_\x95\\\\"
      });
    });
  });

  JSpec.describe('#quote', function(){
    it('is alias of #escape_string', function(){
      conn.method(:quote).should == conn.method(:escape_string)
    });
  });

  JSpec.describe('#client_info', function(){
    it('returns client version as string', function(){
      conn.client_info.should == '5.0.0'
    });
  });

  JSpec.describe('#get_client_info', function(){
    it('returns client version as string', function(){
      conn.get_client_info.should == '5.0.0'
    });
  });

  JSpec.describe('#affected_rows', function(){
    it('returns number of affected rows', function(){
      conn.query('create temporary table t (id int)');
      conn.query('insert into t values (1),(2)');
      conn.affected_rows.should == 2
    });
  });

  JSpec.describe('#character_set_name', function(){
    it('returns charset name', function(){
      m = Mysql.init
      m.options Mysql::SET_CHARSET_NAME, 'cp932'
      m.connect MYSQL_SERVER, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_PORT, MYSQL_SOCKET
      m.character_set_name.should == 'cp932'
    });
  });

  JSpec.describe('#close', function(){
    it('returns self', function(){
      conn.close.should == conn
    });
  });

#  JSpec.describe('#create_db', function(){
#  });

#  JSpec.describe('#drop_db', function(){
#  });

  JSpec.describe('#errno', function(){
    it('default value is 0', function(){
      conn.errno.should == 0
    });
    it('returns error number of latest error', function(){
      conn.query('hogehoge') rescue nil
      conn.errno.should == 1064
    });
  });

  JSpec.describe('#error', function(){
    it('returns error message of latest error', function(){
      conn.query('hogehoge') rescue nil
      conn.error.should == "You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'hogehoge' at line 1"
    });
  });

  JSpec.describe('#field_count', function(){
    it('returns number of fields for latest query', function(){
      conn.query('select 1,2,3');
      conn.field_count.should == 3
    });
  });

  JSpec.describe('#client_version', function(){
    it('returns client version as Integer', function(){
      conn.client_version.should be_kind_of Integer
    });
  });

  JSpec.describe('#get_client_version', function(){
    it('returns client version as Integer', function(){
      conn.get_client_version.should be_kind_of Integer
    });
  });

  JSpec.describe('#get_host_info', function(){
    it('returns connection type as String', function(){
      if MYSQL_SERVER == nil or MYSQL_SERVER == 'localhost'
        conn.get_host_info.should == 'Localhost via UNIX socket'
      else
        conn.get_host_info.should == "#{MYSQL_SERVER} via TCP/IP"
      });
    });
  });

  JSpec.describe('#host_info', function(){
    it('returns connection type as String', function(){
      if MYSQL_SERVER == nil or MYSQL_SERVER == 'localhost'
        conn.host_info.should == 'Localhost via UNIX socket'
      else
        conn.host_info.should == "#{MYSQL_SERVER} via TCP/IP"
      });
    });
  });

  JSpec.describe('#get_proto_info', function(){
    it('returns version of connection as Integer', function(){
      conn.get_proto_info.should == 10
    });
  });

  JSpec.describe('#proto_info', function(){
    it('returns version of connection as Integer', function(){
      conn.proto_info.should == 10
    });
  });

  JSpec.describe('#get_server_info', function(){
    it('returns server version as String', function(){
      conn.get_server_info.should =~ /\A\d+\.\d+\.\d+/
    });
  });

  JSpec.describe('#server_info', function(){
    it('returns server version as String', function(){
      conn.server_info.should =~ /\A\d+\.\d+\.\d+/
    });
  });

  JSpec.describe('#info', function(){
    it('returns information of latest query', function(){
      conn.query('create temporary table t (id int)');
      conn.query('insert into t values (1),(2),(3)');
      conn.info.should == 'Records: 3  Duplicates: 0  Warnings: 0'
    });
  });

  JSpec.describe('#insert_id', function(){
    it('returns latest auto_increment value', function(){
      conn.query('create temporary table t (id int auto_increment, unique (id))');
      conn.query('insert into t values (0)');
      conn.insert_id.should == 1
      conn.query('alter table t auto_increment=1234');
      conn.query('insert into t values (0)');
      conn.insert_id.should == 1234
    });
  });

  JSpec.describe('#kill', function(){
    it('returns self', function(){
      conn.kill(conn.thread_id).should == conn
    });
    it('kill specified connection', function(){
      m = Mysql.new(MYSQL_SERVER, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_PORT, MYSQL_SOCKET)
      m.list_processes.map(&:first).should be_include conn.thread_id.to_s
      m.close
    });
  });

  JSpec.describe('#list_dbs', function(){
    it('returns database list', function(){
      ret = conn.list_dbs
      ret.should be_kind_of Array
      ret.should be_include MYSQL_DATABASE
    });
    it('with pattern returns databases that matches pattern', function(){
      conn.list_dbs('info%').should be_include 'information_schema'
    });
  });

  JSpec.describe('#list_fields', function(){
    before(function(){
      conn.query('create temporary table t (i int, c char(10), d date)');
    });
    it('returns result set that contains information of fields', function(){
      ret = conn.list_fields('t')
      ret.should be_kind_of Mysql::Result
      ret.num_rows.should == 0
      ret.fetch_fields.map{|f|f.name}.should == ['i','c','d']
    });
    it('with pattern returns result set that contains information of fields that matches pattern', function(){
      ret = conn.list_fields('t', 'i')
      ret.should be_kind_of Mysql::Result
      ret.num_rows.should == 0
      ret.fetch_fields.map{|f|f.name}.should == ['i']
    });
  });

  JSpec.describe('#list_processes', function(){
    it('returns result set that contains information of all connections', function(){
      ret = conn.list_processes
      ret.should be_kind_of Mysql::Result
      ret.find{|r|r[0].to_i == conn.thread_id}[4].should == "Processlist"
    });
  });

  JSpec.describe('#list_tables', function(){
    before(function(){
      conn.query('create table test_mysql_list_tables (id int)');
    });
    after(function(){
      conn.query('drop table test_mysql_list_tables');
    });
    it('returns table list', function(){
      ret = conn.list_tables
      ret.should be_kind_of Array
      ret.should be_include 'test_mysql_list_tables'
    });
    it('with pattern returns lists that matches pattern', function(){
      ret = conn.list_tables '%mysql\_list\_t%'
      ret.should be_include 'test_mysql_list_tables'
    });
  });

  JSpec.describe('#ping', function(){
    it('returns self', function(){
      conn.ping.should == conn
    });
  });

  JSpec.describe('#query', function(){
    it('returns Mysql::Result if query returns results', function(){
      conn.query('select 123').should be_kind_of Mysql::Result
    });
    it('returns nil if query returns no results', function(){
      conn.query('set @hoge:=123').should == nil
    });
    it('returns self if query_with_result is false', function(){
      conn.query_with_result = false
      conn.query('select 123').should == conn
      conn.store_result
      conn.query('set @hoge:=123').should == conn
    });
  });

  JSpec.describe('#real_query', function(){
    it('is same as #query', function(){
      conn.real_query('select 123').should be_kind_of Mysql::Result
    });
  });

  JSpec.describe('#refresh', function(){
    it('returns self', function(){
      conn.refresh(Mysql::REFRESH_HOSTS).should == conn
    });
  });

  JSpec.describe('#reload', function(){
    it('returns self', function(){
      conn.reload.should == conn
    });
  });

  JSpec.describe('#select_db', function(){
    it('changes default database', function(){
      conn.select_db 'information_schema'
      conn.query('select database()').fetch_row.first.should == 'information_schema'
    });
  });

#  JSpec.describe('#shutdown', function(){
#  });

  JSpec.describe('#stat', function(){
    it('returns server status', function(){
      conn.stat.should =~ /\AUptime: \d+  Threads: \d+  Questions: \d+  Slow queries: \d+  Opens: \d+  Flush tables: \d+  Open tables: \d+  Queries per second avg: \d+\.\d+\z/
    });
  });

  JSpec.describe('#store_result', function(){
    it('returns Mysql::Result', function(){
      conn.query_with_result = false
      conn.query('select 1,2,3');
      ret = conn.store_result
      ret.should be_kind_of Mysql::Result
      ret.fetch_row.should == ['1','2','3']
    });
    it('raises error when no query', function(){
      proc{conn.store_result}.should raise_error Mysql::Error
    });
    it('raises error when query, function(){es not return results', function(){
      conn.query('set @hoge:=123');
      proc{conn.store_result}.should raise_error Mysql::Error
    });
  });

  JSpec.describe('#thread_id', function(){
    it('returns thread id as Integer', function(){
      conn.thread_id.should be_kind_of Integer
    });
  });

  JSpec.describe('#use_result', function(){
    it('returns Mysql::Result', function(){
      conn.query_with_result = false
      conn.query('select 1,2,3');
      ret = conn.use_result
      ret.should be_kind_of Mysql::Result
      ret.fetch_row.should == ['1','2','3']
    });
    it('raises error when no query', function(){
      proc{conn.use_result}.should raise_error Mysql::Error
    });
    it('raises error when query, function(){es not return results', function(){
      conn.query('set @hoge:=123');
      proc{conn.use_result}.should raise_error Mysql::Error
    });
  });

  JSpec.describe('#get_server_version', function(){
    it('returns server version as Integer', function(){
      conn.get_server_version.should be_kind_of Integer
    });
  });

  JSpec.describe('#server_version', function(){
    it('returns server version as Integer', function(){
      conn.server_version.should be_kind_of Integer
    });
  });

  JSpec.describe('#warning_count', function(){
    it('default values is zero', function(){
      conn.warning_count.should == 0
    });
    it('returns number of warnings', function(){
      conn.query('create temporary table t (i tinyint)');
      conn.query('insert into t values (1234567)');
      conn.warning_count.should == 1
    });
  });

  JSpec.describe('#commit', function(){
    it('returns self', function(){
      conn.commit.should == conn
    });
  });

  JSpec.describe('#rollback', function(){
    it('returns self', function(){
      conn.rollback.should == conn
    });
  });

  JSpec.describe('#autocommit', function(){
    it('returns self', function(){
      conn.autocommit(true).should == conn
    });

    it('change auto-commit(mode', function(){
      conn.autocommit(true)
      conn.query('select @@autocommit').fetch_row.should == ['1']
      conn.autocommit(false)
      conn.query('select @@autocommit').fetch_row.should == ['0']
    });
  });

  JSpec.describe('#set_server_option', function(){
    it('returns self', function(){
      conn.set_server_option(Mysql::OPTION_MULTI_STATEMENTS_ON).should == conn
    });
  });

  JSpec.describe('#sqlstate', function(){
    it('default values is "00000"', function(){
      conn.sqlstate.should == "00000"
    });
    it('returns sqlstate code', function(){
      proc{conn.query("hoge")}.should raise_error
      conn.sqlstate.should == "42000"
    });
  });

  JSpec.describe('#query_with_result', function(){
    it('default value is true', function(){
      conn.query_with_result.should == true
    });
    it('can set value', function(){
      (conn.query_with_result=true).should == true
      conn.query_with_result.should == true
      (conn.query_with_result=false).should == false
      conn.query_with_result.should == false
    });
  });

  JSpec.describe('#query_with_result is false', function(){
    it('Mysql#query returns self and Mysql#store_result returns result set', function(){
      conn.query_with_result = false
      conn.query('select 1,2,3').should == conn
      res = conn.store_result
      res.fetch_row.should == ['1','2','3']
    });
  });

  JSpec.describe('#query with block', function(){
    it('returns self', function(){
      conn.query('select 1'){}.should == conn
    });
    it('evaluate block with Mysql::Result', function(){
      conn.query('select 1'){|res| res.should be_kind_of Mysql::Result}.should == conn
    });
    it('evaluate block multiple times if multiple query is specified', function(){
      conn.set_server_option Mysql::OPTION_MULTI_STATEMENTS_ON
      cnt = 0
      expect = [["1"], ["2"]]
      conn.query('select 1; select 2'){|res|
        res.fetch_row.should == expect.shift
        cnt += 1
      }.should == conn
      cnt.should == 2
    });
    it('evaluate block only when query has result', function(){
      conn.set_server_option Mysql::OPTION_MULTI_STATEMENTS_ON
      cnt = 0
      expect = [["1"], ["2"]]
      conn.query('select 1; set @hoge:=1; select 2'){|res|
        res.fetch_row.should == expect.shift
        cnt += 1
      }.should == conn
      cnt.should == 2
    });
  });
});

JSpec.describe('multiple statement query:', function(){
  before :all, function(){
    conn = Mysql.new(MYSQL_SERVER, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_PORT, MYSQL_SOCKET)
    conn.set_server_option(Mysql::OPTION_MULTI_STATEMENTS_ON)
    @res = conn.query('select 1,2; select 3,4,5');
  });
  it('Mysql#query returns results for first query', function(){
    @res.entries.should == [['1','2']]
  });
  it('Mysql#more_results is true', function(){
    conn.more_results.should == true
  });
  it('Mysql#more_results? is true', function(){
    conn.more_results?.should == true
  });
  it('Mysql#next_result is true', function(){
    conn.next_result.should == true
  });
  it('Mysql#store_result returns results for next query', function(){
    res = conn.store_result
    res.entries.should == [['3','4','5']]
  });
  it('Mysql#more_results is false', function(){
    conn.more_results.should == false
  });
  it('Mysql#more_results? is false', function(){
    conn.more_results?.should == false
  });
  it('Mysql#next_result is false', function(){
    conn.next_result.should == false
  });
});

JSpec.describe('Mysql::Stmt', function(){
  before(function(){
    conn = Mysql.new(MYSQL_SERVER, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_PORT, MYSQL_SOCKET)
    @s = conn.stmt_init
  });

  after(function(){
    @s.close if @s rescue nil
    conn.close if conn
  });

  it('#affected_rows returns number of affected records', function(){
    conn.query('create temporary table t (i int, c char(10))');
    @s.prepare 'insert into t values (?,?)'
    @s.execute 1, 'hoge'
    @s.affected_rows.should == 1
    @s.execute 2, 'hoge'
    @s.execute 3, 'hoge'
    @s.prepare 'update t set c=?'
    @s.execute 'fuga'
    @s.affected_rows.should == 3
  });

  JSpec.describe('#bind_result', function(){
    before(function(){
      conn.query('create temporary table t (i int, c char(10), d, function(){uble, t datetime)');
      conn.query('insert into t values (123,"9abcdefg",1.2345,20091208100446)');
      @s.prepare 'select * from t'
    });

    it('(nil) make result format to be standard value', function(){
      @s.bind_result nil, nil, nil, nil
      @s.execute
      @s.fetch.should == [123, '9abcdefg', 1.2345, Mysql::Time.new(2009,12,8,10,4,46)]
    });

    it('(Numeric) make result format to be Integer value', function(){
      @s.bind_result Numeric, Numeric, Numeric, Numeric
      @s.execute
      @s.fetch.should == [123, 9, 1, 20091208100446]
    });

    it('(Integer) make result format to be Integer value', function(){
      @s.bind_result Integer, Integer, Integer, Integer
      @s.execute
      @s.fetch.should == [123, 9, 1, 20091208100446]
    });

    it('(Fixnum) make result format to be Integer value', function(){
      @s.bind_result Fixnum, Fixnum, Fixnum, Fixnum
      @s.execute
      @s.fetch.should == [123, 9, 1, 20091208100446]
    });

    it('(String) make result format to be String value', function(){
      @s.bind_result String, String, String, String
      @s.execute
      @s.fetch.should == ["123", "9abcdefg", "1.2345", "2009-12-08 10:04:46"]
    });

    it('(Float) make result format to be Float value', function(){
      @s.bind_result Float, Float, Float, Float
      @s.execute
      @s.fetch.should == [123.0, 9.0, 1.2345 , 20091208100446.0]
    });

    it('(Mysql::Time) make result format to be Mysql::Time value', function(){
      @s.bind_result Mysql::Time, Mysql::Time, Mysql::Time, Mysql::Time
      @s.execute
      @s.fetch.should == [Mysql::Time.new(2000,1,23), Mysql::Time.new, Mysql::Time.new, Mysql::Time.new(2009,12,8,10,4,46)]
    });

    it('(invalid) raises error', function(){
      proc{@s.bind_result(Time, nil, nil, nil)}.should raise_error(TypeError)
    });

    it('with mismatch argument count raise error', function(){
      proc{@s.bind_result(nil)}.should raise_error(Mysql::ClientError, 'bind_result: result value count(4) != number of argument(1)')
    });
  });

  it('#close returns nil', function(){
    @s.close.should == nil
  });

  it('#data_seek set position of current record', function(){
    conn.query('create temporary table t (i int)');
    conn.query('insert into t values (0),(1),(2),(3),(4),(5),(6)');
    @s.prepare 'select i from t'
    @s.execute
    @s.fetch.should == [0]
    @s.fetch.should == [1]
    @s.fetch.should == [2]
    @s.data_seek 5
    @s.fetch.should == [5]
    @s.data_seek 1
    @s.fetch.should == [1]
  });

  it('#each iterate block with a record', function(){
    conn.query('create temporary table t (i int, c char(255), d datetime)');
    conn.query("insert into t values (1,'abc','19701224235905'),(2,'def','21120903123456'),(3,'123',null)");
    @s.prepare 'select * from t'
    @s.execute
    expect = [
      [1, 'abc', Mysql::Time.new(1970,12,24,23,59,05)],
      [2, 'def', Mysql::Time.new(2112,9,3,12,34,56)],
      [3, '123', nil],
    ]
    @s.each, function(){ |a|
      a.should == expect.shift
    });
  });

  it('#execute returns self', function(){
    @s.prepare 'select 1'
    @s.execute.should == @s
  });

  it('#execute pass arguments to query', function(){
    conn.query('create temporary table t (i int)');
    @s.prepare 'insert into t values (?)'
    @s.execute 123
    @s.execute '456'
    conn.query('select * from t').entries.should == [['123'], ['456']]
  });

  it('#execute with various arguments', function(){
    conn.query('create temporary table t (i int, c char(255), t timestamp)');
    @s.prepare 'insert into t values (?,?,?)'
    @s.execute 123, 'hoge', Time.local(2009,12,8,19,56,21)
    conn.query('select * from t').fetch_row.should == ['123', 'hoge', '2009-12-08 19:56:21']
  });

  it('#execute with arguments that is invalid count raise error', function(){
    @s.prepare 'select ?'
    proc{@s.execute 123, 456}.should raise_error(Mysql::ClientError, 'parameter count mismatch')
  });

  it('#execute with huge value', function(){
    [30, 31, 32, 62, 63].each, function(){ |i|
      conn.prepare('select cast(? as signed)').execute(2**i-1).fetch.should == [2**i-1]
      conn.prepare('select cast(? as signed)').execute(-(2**i)).fetch.should == [-2**i]
    });
  });

  it('#fetch returns result-record', function(){
    @s.prepare 'select 123, "abc", null'
    @s.execute
    @s.fetch.should == [123, 'abc', nil]
  });

  it('#fetch bit(column (8bit)', function(){
    conn.query('create temporary table t (i bit(8))');
    conn.query('insert into t values (0),(-1),(127),(-128),(255),(-255),(256)');
    @s.prepare 'select i from t'
    @s.execute
    if defined? Encoding
      @s.entries.should == [
        ["\x00".force_encoding('ASCII-8BIT')],
        ["\xff".force_encoding('ASCII-8BIT')],
        ["\x7f".force_encoding('ASCII-8BIT')],
        ["\xff".force_encoding('ASCII-8BIT')],
        ["\xff".force_encoding('ASCII-8BIT')],
        ["\xff".force_encoding('ASCII-8BIT')],
        ["\xff".force_encoding('ASCII-8BIT')],
      ]
    else
      @s.entries.should == [["\x00"], ["\xff"], ["\x7f"], ["\xff"], ["\xff"], ["\xff"], ["\xff"]]
    });
  });

  it('#fetch bit(column (64bit)', function(){
    conn.query('create temporary table t (i bit(64))');
    conn.query('insert into t values (0),(-1),(4294967296),(18446744073709551615),(18446744073709551616)');
    @s.prepare 'select i from t'
    @s.execute
    if defined? Encoding
      @s.entries.should == [
        ["\x00\x00\x00\x00\x00\x00\x00\x00".force_encoding('ASCII-8BIT')],
        ["\xff\xff\xff\xff\xff\xff\xff\xff".force_encoding('ASCII-8BIT')],
        ["\x00\x00\x00\x01\x00\x00\x00\x00".force_encoding('ASCII-8BIT')],
        ["\xff\xff\xff\xff\xff\xff\xff\xff".force_encoding('ASCII-8BIT')],
        ["\xff\xff\xff\xff\xff\xff\xff\xff".force_encoding('ASCII-8BIT')],
      ]
    else
      @s.entries.should == [
        ["\x00\x00\x00\x00\x00\x00\x00\x00"],
        ["\xff\xff\xff\xff\xff\xff\xff\xff"],
        ["\x00\x00\x00\x01\x00\x00\x00\x00"],
        ["\xff\xff\xff\xff\xff\xff\xff\xff"],
        ["\xff\xff\xff\xff\xff\xff\xff\xff"],
      ]
    });
  });

  it('#fetch tinyint column', function(){
    conn.query('create temporary table t (i tinyint)');
    conn.query('insert into t values (0),(-1),(127),(-128),(255),(-255)');
    @s.prepare 'select i from t'
    @s.execute
    @s.entries.should == [[0], [-1], [127], [-128], [127], [-128]]
  });

  it('#fetch tinyint unsigned column', function(){
    conn.query('create temporary table t (i tinyint unsigned)');
    conn.query('insert into t values (0),(-1),(127),(-128),(255),(-255),(256)');
    @s.prepare 'select i from t'
    @s.execute
    @s.entries.should == [[0], [0], [127], [0], [255], [0], [255]]
  });

  it('#fetch smallint column', function(){
    conn.query('create temporary table t (i smallint)');
    conn.query('insert into t values (0),(-1),(32767),(-32768),(65535),(-65535),(65536)');
    @s.prepare 'select i from t'
    @s.execute
    @s.entries.should == [[0], [-1], [32767], [-32768], [32767], [-32768], [32767]]
  });

  it('#fetch smallint unsigned column', function(){
    conn.query('create temporary table t (i smallint unsigned)');
    conn.query('insert into t values (0),(-1),(32767),(-32768),(65535),(-65535),(65536)');
    @s.prepare 'select i from t'
    @s.execute
    @s.entries.should == [[0], [0], [32767], [0], [65535], [0], [65535]]
  });

  it('#fetch mediumint column', function(){
    conn.query('create temporary table t (i mediumint)');
    conn.query('insert into t values (0),(-1),(8388607),(-8388608),(16777215),(-16777215),(16777216)');
    @s.prepare 'select i from t'
    @s.execute
    @s.entries.should == [[0], [-1], [8388607], [-8388608], [8388607], [-8388608], [8388607]]
  });

  it('#fetch mediumint unsigned column', function(){
    conn.query('create temporary table t (i mediumint unsigned)');
    conn.query('insert into t values (0),(-1),(8388607),(-8388608),(16777215),(-16777215),(16777216)');
    @s.prepare 'select i from t'
    @s.execute
    @s.entries.should == [[0], [0], [8388607], [0], [16777215], [0], [16777215]]
  });

  it('#fetch int column', function(){
    conn.query('create temporary table t (i int)');
    conn.query('insert into t values (0),(-1),(2147483647),(-2147483648),(4294967295),(-4294967295),(4294967296)');
    @s.prepare 'select i from t'
    @s.execute
    @s.entries.should == [[0], [-1], [2147483647], [-2147483648], [2147483647], [-2147483648], [2147483647]]
  });

  it('#fetch int unsigned column', function(){
    conn.query('create temporary table t (i int unsigned)');
    conn.query('insert into t values (0),(-1),(2147483647),(-2147483648),(4294967295),(-4294967295),(4294967296)');
    @s.prepare 'select i from t'
    @s.execute
    @s.entries.should == [[0], [0], [2147483647], [0], [4294967295], [0], [4294967295]]
  });

  it('#fetch bigint column', function(){
    conn.query('create temporary table t (i bigint)');
    conn.query('insert into t values (0),(-1),(9223372036854775807),(-9223372036854775808),(18446744073709551615),(-18446744073709551615),(18446744073709551616)');
    @s.prepare 'select i from t'
    @s.execute
    @s.entries.should == [[0], [-1], [9223372036854775807], [-9223372036854775808], [9223372036854775807], [-9223372036854775808], [9223372036854775807]]
  });

  it('#fetch bigint unsigned column', function(){
    conn.query('create temporary table t (i bigint unsigned)');
    conn.query('insert into t values (0),(-1),(9223372036854775807),(-9223372036854775808),(18446744073709551615),(-18446744073709551615),(18446744073709551616)');
    @s.prepare 'select i from t'
    @s.execute
    @s.entries.should == [[0], [0], [9223372036854775807], [0], [18446744073709551615], [0], [18446744073709551615]]
  });

  it('#fetch float column', function(){
    conn.query('create temporary table t (i float)');
    conn.query('insert into t values (0),(-3.402823466E+38),(-1.175494351E-38),(1.175494351E-38),(3.402823466E+38)');
    @s.prepare 'select i from t'
    @s.execute
    @s.fetch[0].should == 0.0
    (@s.fetch[0] - -3.402823466E+38).abs.should < 0.000000001E+38
    (@s.fetch[0] - -1.175494351E-38).abs.should < 0.000000001E-38
    (@s.fetch[0] -  1.175494351E-38).abs.should < 0.000000001E-38
    (@s.fetch[0] -  3.402823466E+38).abs.should < 0.000000001E+38
  });

  it('#fetch float unsigned column', function(){
    conn.query('create temporary table t (i float unsigned)');
    conn.query('insert into t values (0),(-3.402823466E+38),(-1.175494351E-38),(1.175494351E-38),(3.402823466E+38)');
    @s.prepare 'select i from t'
    @s.execute
    @s.fetch[0].should == 0.0
    @s.fetch[0].should == 0.0
    @s.fetch[0].should == 0.0
    (@s.fetch[0] -  1.175494351E-38).abs.should < 0.000000001E-38
    (@s.fetch[0] -  3.402823466E+38).abs.should < 0.000000001E+38
  });

  it('#fetch, function(){uble column', function(){
    conn.query('create temporary table t (i, function(){uble)');
    conn.query('insert into t values (0),(-1.7976931348623157E+308),(-2.2250738585072014E-308),(2.2250738585072014E-308),(1.7976931348623157E+308)');
    @s.prepare 'select i from t'
    @s.execute
    @s.fetch[0].should == 0.0
    (@s.fetch[0] - -Float::MAX).abs.should < Float::EPSILON
    (@s.fetch[0] - -Float::MIN).abs.should < Float::EPSILON
    (@s.fetch[0] -  Float::MIN).abs.should < Float::EPSILON
    (@s.fetch[0] -  Float::MAX).abs.should < Float::EPSILON
  });

  it('#fetch, function(){uble unsigned column', function(){
    conn.query('create temporary table t (i, function(){uble unsigned)');
    conn.query('insert into t values (0),(-1.7976931348623157E+308),(-2.2250738585072014E-308),(2.2250738585072014E-308),(1.7976931348623157E+308)');
    @s.prepare 'select i from t'
    @s.execute
    @s.fetch[0].should == 0.0
    @s.fetch[0].should == 0.0
    @s.fetch[0].should == 0.0
    (@s.fetch[0] - Float::MIN).abs.should < Float::EPSILON
    (@s.fetch[0] - Float::MAX).abs.should < Float::EPSILON
  });

  it('#fetch decimal column', function(){
    conn.query('create temporary table t (i decimal)');
    conn.query('insert into t values (0),(9999999999),(-9999999999),(10000000000),(-10000000000)');
    @s.prepare 'select i from t'
    @s.execute
    @s.entries.should == [["0"], ["9999999999"], ["-9999999999"], ["9999999999"], ["-9999999999"]]
  });

  it('#fetch decimal unsigned column', function(){
    conn.query('create temporary table t (i decimal unsigned)');
    conn.query('insert into t values (0),(9999999998),(9999999999),(-9999999998),(-9999999999),(10000000000),(-10000000000)');
    @s.prepare 'select i from t'
    @s.execute
    @s.entries.should == [["0"], ["9999999998"], ["9999999999"], ["0"], ["0"], ["9999999999"], ["0"]]
  });

  it('#fetch date column', function(){
    conn.query('create temporary table t (i date)');
    conn.query("insert into t values ('0000-00-00'),('1000-01-01'),('9999-12-31')");
    @s.prepare 'select i from t'
    @s.execute
    @s.fetch.should == [Mysql::Time.new]
    @s.fetch.should == [Mysql::Time.new(1000,1,1)]
    @s.fetch.should == [Mysql::Time.new(9999,12,31)]
  });

  it('#fetch datetime column', function(){
    conn.query('create temporary table t (i datetime)');
    conn.query("insert into t values ('0000-00-00 00:00:00'),('1000-01-01 00:00:00'),('9999-12-31 23:59:59')");
    @s.prepare 'select i from t'
    @s.execute
    @s.fetch.should == [Mysql::Time.new]
    @s.fetch.should == [Mysql::Time.new(1000,1,1)]
    @s.fetch.should == [Mysql::Time.new(9999,12,31,23,59,59)]
  });

  it('#fetch timestamp column', function(){
    conn.query('create temporary table t (i timestamp)');
    conn.query("insert into t values ('1970-01-02 00:00:00'),('2037-12-30 23:59:59')")
    @s.prepare 'select i from t'
    @s.execute
    @s.fetch.should == [Mysql::Time.new(1970,1,2)]
    @s.fetch.should == [Mysql::Time.new(2037,12,30,23,59,59)]
  });

  it('#fetch time column', function(){
    conn.query('create temporary table t (i time)');
    conn.query("insert into t values ('-838:59:59'),(0),('838:59:59')");
    @s.prepare 'select i from t'
    @s.execute
    @s.fetch.should == [Mysql::Time.new(0,0,0,838,59,59,true)]
    @s.fetch.should == [Mysql::Time.new(0,0,0,0,0,0,false)]
    @s.fetch.should == [Mysql::Time.new(0,0,0,838,59,59,false)]
  });

  it('#fetch year column', function(){
    conn.query('create temporary table t (i year)');
    conn.query('insert into t values (0),(70),(69),(1901),(2155)');
    @s.prepare 'select i from t'
    @s.execute
    @s.entries.should == [[0], [1970], [2069], [1901], [2155]]
  });

  it('#fetch char column', function(){
    conn.query('create temporary table t (i char(10))');
    conn.query("insert into t values (null),('abc')");
    @s.prepare 'select i from t'
    @s.execute
    @s.entries.should == [[nil], ['abc']]
  });

  it('#fetch varchar column', function(){
    conn.query('create temporary table t (i varchar(10))');
    conn.query("insert into t values (null),('abc')");
    @s.prepare 'select i from t'
    @s.execute
    @s.entries.should == [[nil], ['abc']]
  });

  it('#fetch binary column', function(){
    conn.query('create temporary table t (i binary(10))');
    conn.query("insert into t values (null),('abc')");
    @s.prepare 'select i from t'
    @s.execute
    @s.entries.should == [[nil], ["abc\0\0\0\0\0\0\0"]]
  });

  it('#fetch varbinary column', function(){
    conn.query('create temporary table t (i varbinary(10))');
    conn.query("insert into t values (null),('abc')");
    @s.prepare 'select i from t'
    @s.execute
    @s.entries.should == [[nil], ["abc"]]
  });

  it('#fetch tinyblob column', function(){
    conn.query('create temporary table t (i tinyblob)');
    conn.query("insert into t values (null),('abc')");
    @s.prepare 'select i from t'
    @s.execute
    @s.entries.should == [[nil], ["abc"]]
  });

  it('#fetch tinytext column', function(){
    conn.query('create temporary table t (i tinytext)');
    conn.query("insert into t values (null),('abc')");
    @s.prepare 'select i from t'
    @s.execute
    @s.entries.should == [[nil], ["abc"]]
  });

  it('#fetch blob column', function(){
    conn.query('create temporary table t (i blob)');
    conn.query("insert into t values (null),('abc')");
    @s.prepare 'select i from t'
    @s.execute
    @s.entries.should == [[nil], ["abc"]]
  });

  it('#fetch text column', function(){
    conn.query('create temporary table t (i text)');
    conn.query("insert into t values (null),('abc')");
    @s.prepare 'select i from t'
    @s.execute
    @s.entries.should == [[nil], ["abc"]]
  });

  it('#fetch mediumblob column', function(){
    conn.query('create temporary table t (i mediumblob)');
    conn.query("insert into t values (null),('abc')");
    @s.prepare 'select i from t'
    @s.execute
    @s.entries.should == [[nil], ["abc"]]
  });

  it('#fetch mediumtext column', function(){
    conn.query('create temporary table t (i mediumtext)');
    conn.query("insert into t values (null),('abc')");
    @s.prepare 'select i from t'
    @s.execute
    @s.entries.should == [[nil], ["abc"]]
  });

  it('#fetch longblob column', function(){
    conn.query('create temporary table t (i longblob)');
    conn.query("insert into t values (null),('abc')");
    @s.prepare 'select i from t'
    @s.execute
    @s.entries.should == [[nil], ["abc"]]
  });

  it('#fetch longtext column', function(){
    conn.query('create temporary table t (i longtext)');
    conn.query("insert into t values (null),('abc')");
    @s.prepare 'select i from t'
    @s.execute
    @s.entries.should == [[nil], ["abc"]]
  });

  it('#fetch enum column', function(){
    conn.query("create temporary table t (i enum('abc','def'))");
    conn.query("insert into t values (null),(0),(1),(2),('abc'),('def'),('ghi')");
    @s.prepare 'select i from t'
    @s.execute
    @s.entries.should == [[nil], [''], ['abc'], ['def'], ['abc'], ['def'], ['']]
  });

  it('#fetch set column', function(){
    conn.query("create temporary table t (i set('abc','def'))");
    conn.query("insert into t values (null),(0),(1),(2),(3),('abc'),('def'),('abc,def'),('ghi')");
    @s.prepare 'select i from t'
    @s.execute
    @s.entries.should == [[nil], [''], ['abc'], ['def'], ['abc,def'], ['abc'], ['def'], ['abc,def'], ['']]
  });

  it('#field_count', function(){
    @s.prepare 'select 1,2,3'
    @s.field_count.should == 3
    @s.prepare 'set @a=1'
    @s.field_count.should == 0
  });

  it('#free_result', function(){
    @s.free_result
    @s.prepare 'select 1,2,3'
    @s.execute
    @s.free_result
  });

  it('#insert_id', function(){
    conn.query('create temporary table t (i int auto_increment, unique(i))');
    @s.prepare 'insert into t values (0)'
    @s.execute
    @s.insert_id.should == 1
    @s.execute
    @s.insert_id.should == 2
  });

  it('#num_rows', function(){
    conn.query('create temporary table t (i int)');
    conn.query('insert into t values (1),(2),(3),(4)');
    @s.prepare 'select * from t'
    @s.execute
    @s.num_rows.should == 4
  });

  it('#param_count', function(){
    conn.query('create temporary table t (a int, b int, c int)');
    @s.prepare 'select * from t'
    @s.param_count.should == 0
    @s.prepare 'insert into t values (?,?,?)'
    @s.param_count.should == 3
  });

  it('#prepare', function(){
    @s.prepare('select 1').should be_kind_of Mysql::Stmt
    proc{@s.prepare 'invalid syntax'}.should raise_error Mysql::ParseError
  });

  it('#prepare returns self', function(){
    @s.prepare('select 1').should == @s
  });

  it('#prepare with invalid query raises error', function(){
    proc{@s.prepare 'invalid query'}.should raise_error Mysql::ParseError
  });

  it('#result_metadata', function(){
    @s.prepare 'select 1 foo, 2 bar'
    f = @s.result_metadata.fetch_fields
    f[0].name.should == 'foo'
    f[1].name.should == 'bar'
  });

  it('#result_metadata forn no data', function(){
    @s.prepare 'set @a=1'
    @s.result_metadata.should == nil
  });

  it('#row_seek and #row_tell', function(){
    conn.query('create temporary table t (i int)');
    conn.query('insert into t values (0),(1),(2),(3),(4)');
    @s.prepare 'select * from t'
    @s.execute
    row0 = @s.row_tell
    @s.fetch.should == [0]
    @s.fetch.should == [1]
    row2 = @s.row_seek row0
    @s.fetch.should == [0]
    @s.row_seek row2
    @s.fetch.should == [2]
  });

  it('#sqlstate', function(){
    @s.prepare 'select 1'
    @s.sqlstate.should == '00000'
    proc{@s.prepare 'hogehoge'}.should raise_error Mysql::ParseError
    @s.sqlstate.should == '42000'
  });
});

JSpec.describe('Mysql::Time', function(){
  before(function(){
    @t = Mysql::Time.new
  });

  it('.new with no arguments returns 0', function(){
    @t.year.should == 0
    @t.month.should == 0
    @t.day.should == 0
    @t.hour.should == 0
    @t.minute.should == 0
    @t.second.should == 0
    @t.neg.should == false
    @t.second_part.should == 0
  });

  it('#inspect', function(){
    Mysql::Time.new(2009,12,8,23,35,21).inspect.should == '#<Mysql::Time:2009-12-08 23:35:21>'
  });

  it('#to_s', function(){
    Mysql::Time.new(2009,12,8,23,35,21).to_s.should == '2009-12-08 23:35:21'
  });

  it('#to_i', function(){
    Mysql::Time.new(2009,12,8,23,35,21).to_i.should == 20091208233521
  });

  it('#year', function(){
    (@t.year = 2009).should == 2009
    @t.year.should == 2009
  });

  it('#month', function(){
    (@t.month = 12).should == 12
    @t.month.should == 12
  });

  it('#day', function(){
    (@t.day = 8).should == 8
    @t.day.should == 8
  });

  it('#hour', function(){
    (@t.hour = 23).should == 23
    @t.hour.should == 23
  });

  it('#minute', function(){
    (@t.minute = 35).should == 35
    @t.minute.should == 35
  });

  it('#second', function(){
    (@t.second = 21).should == 21
    @t.second.should == 21
  });

  it('#neg', function(){
    @t.neg.should == false
  });

  it('#second_part', function(){
    @t.second_part.should == 0
  });

  it('#==', function(){
    t1 = Mysql::Time.new 2009,12,8,23,35,21
    t2 = Mysql::Time.new 2009,12,8,23,35,21
    t1.should == t2
  });
});

JSpec.describe('Mysql::Error', function(){
  before(function(){
    m = Mysql.connect(MYSQL_SERVER, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_PORT, MYSQL_SOCKET)
    begin
      m.query('hogehoge')
    rescue => @e
    });
  });

  it('#error is error message', function(){
    @e.error.should == "You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'hogehoge' at line 1"
  });

  it('#errno is error number', function(){
    @e.errno.should == 1064
  });

  it('#sqlstate is sqlstate value as String', function(){
    @e.sqlstate.should == '42000'
  });
});

if defined? Encoding
  JSpec.describe('Connection charset is UTF-8:', function(){
    before(function(){
      conn = Mysql.connect(MYSQL_SERVER, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_PORT, MYSQL_SOCKET)
      conn.charset = "utf8"
      conn.query("create temporary table t (utf8 char(10) charset utf8, cp932 char(10) charset cp932, eucjp char(10) charset eucjpms, bin varbinary(10))");
      @utf8 = "いろは"
      @cp932 = @utf8.encode "CP932"
      @eucjp = @utf8.encode "EUC-JP-MS"
      @bin = "\x00\x01\x7F\x80\xFE\xFF".force_encoding("ASCII-8BIT")
    });

    JSpec.describe('query with CP932 encoding', function(){
      it('is converted to UTF-8', function(){
        conn.query('select HEX("あいう")'.encode("CP932")).fetch.should == ["E38182E38184E38186"]
      });
    });

    JSpec.describe('prepared statement with CP932 encoding', function(){
      it('is converted to UTF-8', function(){
        conn.prepare('select HEX("あいう")'.encode("CP932")).execute.fetch.should == ["E38182E38184E38186"]
      });
    });

    JSpec.describe('The encoding of data are correspond to charset of column:', function(){
      before(function(){
        conn.prepare("insert into t (utf8,cp932,eucjp,bin) values (?,?,?,?)").execute @utf8, @cp932, @eucjp, @bin
      });
      it('data is stored as is', function(){
        conn.query('select hex(utf8),hex(cp932),hex(eucjp),hex(bin) from t').fetch.should == ['E38184E3828DE381AF', '82A282EB82CD', 'A4A4A4EDA4CF', '00017F80FEFF']
      });
      it('By simple query, charset of retrieved data is connection charset', function(){
        conn.query('select utf8,cp932,eucjp,bin from t').fetch.should == [@utf8, @utf8, @utf8, @bin.dup.force_encoding("UTF-8")]
      });
      it('By prepared statement, charset of retrieved data is connection charset except for binary', function(){
        conn.prepare('select utf8,cp932,eucjp,bin from t').execute.fetch.should == [@utf8, @utf8, @utf8, @bin]
      });
    });

    JSpec.describe('The encoding of data are different from charset of column:', function(){
      before(function(){
        conn.prepare("insert into t (utf8,cp932,eucjp,bin) values (?,?,?,?)").execute @utf8, @utf8, @utf8, @utf8
      });
      it('stored data is converted', function(){
        conn.query("select hex(utf8),hex(cp932),hex(eucjp),hex(bin) from t").fetch.should == ["E38184E3828DE381AF", "82A282EB82CD", "A4A4A4EDA4CF", "E38184E3828DE381AF"]
      });
      it('By simple query, charset of retrieved data is connection charset', function(){
        conn.query("select utf8,cp932,eucjp,bin from t").fetch.should == [@utf8, @utf8, @utf8, @utf8]
      });
      it('By prepared statement, charset of retrieved data is connection charset except for binary', function(){
        conn.prepare("select utf8,cp932,eucjp,bin from t").execute.fetch.should == [@utf8, @utf8, @utf8, @utf8.dup.force_encoding("ASCII-8BIT")]
      });
    });

    JSpec.describe('The data include invalid byte code:', function(){
      it('raises Encoding::InvalidByteSequenceError', function(){
        cp932 = "\x01\xFF\x80".force_encoding("CP932")
        proc{conn.prepare("insert into t (cp932) values (?)").execute cp932}.should raise_error(Encoding::InvalidByteSequenceError)
      });
    });
  });
});
*/

/*
node-mysql
A node.js interface for MySQL

Author: masuidrive <masui@masuidrive.jp>
License: MIT License
Copyright (c) Yuichiro MASUI
*/
