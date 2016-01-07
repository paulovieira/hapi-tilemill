//
//  TileMillChildProcess.m
//  TileMill
//
//  Copyright 2011-2014 Mapbox, Inc. All rights reserved.
//

#import "TileMillChildProcess.h"

@interface TileMillChildProcess ()

@property (nonatomic, strong) NSTask *task;
@property (nonatomic, strong) NSString *basePath;
@property (nonatomic, strong) NSString *command;
@property (nonatomic, assign, getter=isLaunched) BOOL launched;

- (void)receivedData:(NSNotification *)notification;

@end

#pragma mark -

@implementation TileMillChildProcess

@synthesize delegate;
@synthesize task;
@synthesize basePath;
@synthesize command;
@synthesize launched;
@synthesize port;

- (id)initWithBasePath:(NSString *)inBasePath command:(NSString *)inCommand
{
    self = [super init];
    
    if (self)
    {
        basePath = inBasePath;
        command  = inCommand;
    }

    return self;
}

- (void)dealloc
{
    [self stopProcess];
}

#pragma mark -

- (void)startProcess
{
    if ([self.delegate respondsToSelector:@selector(childProcessDidStart:)])
        [self.delegate childProcessDidStart:self];
 
    self.task = [[NSTask alloc] init];
    NSDictionary *defaultEnvironment = [[NSProcessInfo processInfo] environment];
    NSMutableDictionary *environment = [[NSMutableDictionary alloc] initWithDictionary:defaultEnvironment];
    
    // be proactive and make sure the local tilemill directory comes first on PATH
    // to do all we can to avoid: https://github.com/mapbox/tilemill/issues/1348
    NSString *path_prepend = [NSString stringWithFormat:@"%@;$PATH", [[NSBundle mainBundle] resourcePath]];
    [environment setObject:path_prepend forKey:@"PATH"];
    // clear out NODE_PATH
    [environment setObject:@"" forKey:@"NODE_PATH"];

    [self.task setEnvironment:environment];
    [self.task setStandardOutput:[NSPipe pipe]];
    [self.task setStandardError:[self.task standardOutput]];
    [self.task setCurrentDirectoryPath:self.basePath];
    [self.task setLaunchPath:self.command];
    
    [[NSNotificationCenter defaultCenter] addObserver:self 
                                             selector:@selector(receivedData:) 
                                                 name:NSFileHandleReadCompletionNotification 
                                               object:[[self.task standardOutput] fileHandleForReading]];
    
    [[[self.task standardOutput] fileHandleForReading] readInBackgroundAndNotify];
    
    [self.task launch];
}

- (void)stopProcess
{
    [[NSNotificationCenter defaultCenter] removeObserver:self 
                                                    name:NSFileHandleReadCompletionNotification 
                                                  object:[[self.task standardOutput] fileHandleForReading]];

    // @TODO - check if [self.task isRunning] before terminating?
    [self.task terminate];
    [self.task waitUntilExit];

    int status = [self.task terminationStatus];
    if (status != 0)
    {
        NSTaskTerminationReason reason = [self.task terminationReason];
        // TODO - catch signals and display crash/spin log from DiagosticReports
        // http://cocoawithlove.com/2010/05/handling-unhandled-exceptions-and.html
        if (reason == 2) // uncaught signal
        {
            if ([self.delegate respondsToSelector:@selector(childProcess:didCrash:)])
                [self.delegate childProcess:self didCrash:@"TileMill child process crashed on unhandled signal: please report to: https://github.com/mapbox/tilemill/issues\n"];
        }
    }

    if ([self.delegate respondsToSelector:@selector(childProcessDidFinish:)])
    {
        [self.delegate childProcessDidFinish:self];
    }
}

- (void)receivedData:(NSNotification *)notification
{
    NSData *data = [[notification userInfo] objectForKey:NSFileHandleNotificationDataItem];
    
    if ([data length])
    {
        NSString *message = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];

        if ([self.delegate respondsToSelector:@selector(childProcess:didSendOutput:)])
            [self.delegate childProcess:self didSendOutput:message];
        
        if ([message hasPrefix:@"[tilemill] Started [Server Core"] && ! self.isLaunched)
        {
            self.launched = YES;
            NSScanner *aScanner = [NSScanner scannerWithString:message];
            NSInteger aPort;
            [aScanner scanString:@"[tilemill] Started [Server Core:" intoString:NULL];
            [aScanner scanInteger:&aPort];
            self.port = aPort;
            
            if ([self.delegate respondsToSelector:@selector(childProcessDidSendFirstData:)])
                [self.delegate childProcessDidSendFirstData:self];
        }
    }
    else
    {
        [self stopProcess];
    }
    
    [[notification object] readInBackgroundAndNotify];  
}

@end